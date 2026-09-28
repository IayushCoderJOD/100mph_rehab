import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { RequirePermission } from '@/access';
import { ApiError, UpdateExercisePayload, adminApi, messageFor } from '@/api';
import { PageHeader } from '@/components/common';
import { TextField } from '@/components/form';
import { VideoPoster } from '@/components/session';
import { Button, Card, Screen, Text } from '@/components/ui';
import { CATEGORY_LABEL, EXERCISE_CATEGORIES, Exercise, ExerciseCategory } from '@/data';
import {
  MAX_VIDEO_MB,
  UploadCancelled,
  UploadStage,
  VIDEO_ACCEPT,
  canUploadHere,
  checkVideoFile,
  uploadExerciseVideo,
  useExerciseLibrary,
} from '@/exercises';
import { useHover } from '@/hooks/useHover';
import { useDismiss } from '@/navigation/useDismiss';
import { useTheme } from '@/theme';

type Form = {
  name: string;
  category: ExerciseCategory | null;
  focus: string;
  suggested_sets: string;
  prerequisites: string;
  instructions: string;
  purpose: string;
};

type TextKey = Exclude<keyof Form, 'category'>;

const EMPTY: Form = {
  name: '',
  category: null,
  focus: '',
  suggested_sets: '',
  prerequisites: '',
  instructions: '',
  purpose: '',
};

const TEXT_KEYS: TextKey[] = ['name', 'focus', 'suggested_sets', 'prerequisites', 'instructions', 'purpose'];

function formFrom(exercise: Exercise): Form {
  return {
    name: exercise.name ?? '',
    category: exercise.category ?? null,
    focus: exercise.focus ?? '',
    suggested_sets: exercise.suggested_sets ?? '',
    prerequisites: exercise.prerequisites ?? '',
    instructions: exercise.instructions ?? '',
    purpose: exercise.purpose ?? '',
  };
}

/** Only what changed, so an edit never overwrites a field someone else just saved. */
function changesBetween(form: Form, saved: Form): UpdateExercisePayload {
  const patch: UpdateExercisePayload = {};
  TEXT_KEYS.forEach((key) => {
    if (form[key].trim() !== saved[key].trim()) patch[key] = form[key].trim();
  });
  if (form.category && form.category !== saved.category) patch.category = form.category;
  return patch;
}

/** The browser's own file chooser. Web only. */
function chooseVideoFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = VIDEO_ACCEPT;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.addEventListener('cancel', () => resolve(null));
    input.click();
  });
}

function formatSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatDuration(seconds: number): string {
  const whole = Math.round(seconds);
  return whole >= 60 ? `${Math.floor(whole / 60)}m ${whole % 60}s` : `${whole}s`;
}

function CategoryChip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { theme } = useTheme();
  const { hovered, hoverProps } = useHover();
  return (
    <Pressable
      {...hoverProps}
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        {
          borderRadius: theme.radius.pill,
          backgroundColor: active ? theme.colors.accentSoft : hovered ? theme.colors.surfaceAlt : theme.colors.surface,
          borderColor: active ? theme.colors.accentBorder : theme.colors.border,
        },
      ]}
    >
      <Text variant="label" color={active ? 'textPrimary' : 'textSecondary'}>
        {label}
      </Text>
    </Pressable>
  );
}

function UploadProgress({ stage, onCancel }: { stage: UploadStage; onCancel: () => void }) {
  const { theme } = useTheme();
  const fraction = stage.step === 'uploading' ? stage.progress : stage.step === 'saving' ? 1 : 0;
  const label =
    stage.step === 'checking'
      ? 'Checking the video…'
      : stage.step === 'uploading'
        ? `Uploading… ${Math.round(stage.progress * 100)}%`
        : 'Saving…';

  return (
    <View style={styles.progress} accessibilityLiveRegion="polite">
      <View style={styles.progressHead}>
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
        {stage.step !== 'saving' ? (
          <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button">
            <Text variant="label" color="accent">
              Cancel
            </Text>
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.track, { backgroundColor: theme.colors.surfaceAlt }]}>
        <View
          style={[styles.fill, { width: `${Math.round(fraction * 100)}%`, backgroundColor: theme.colors.accent }]}
        />
      </View>
    </View>
  );
}

function describe(err: unknown): string {
  if (err instanceof ApiError) return messageFor(err);
  if (err instanceof Error) return err.message;
  return messageFor(err);
}

/**
 * One movement: its guide text, its demonstration, and whether coaches can
 * pick it. The same screen adds a new movement (/admin/exercises/new).
 *
 * The text and the video are separate on purpose. "Save Changes" only ever
 * saves text; the video has its own actions — upload, replace, remove — each
 * of which finishes on its own. So replacing a video never touches the name or
 * instructions, and a slow upload never holds the form hostage.
 *
 * Replacing is safe to do on a movement clients are using: the current video
 * stays attached until the new one has fully uploaded and been checked, and a
 * failed or cancelled upload changes nothing for them.
 */
function ExerciseEditor() {
  const router = useRouter();
  const { theme } = useTheme();
  const dismiss = useDismiss('/admin/exercises');
  const { id } = useLocalSearchParams<{ id: string }>();
  const library = useExerciseLibrary();

  const isNew = !id || id === 'new';
  const existing = isNew ? null : library.find(id);
  const readOnly = library.usingBundledCatalogue;

  // ---- the guide text
  const [form, setForm] = useState<Form>(EMPTY);
  const [hidden, setHidden] = useState(false);
  const [loadedFor, setLoadedFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // ---- the video
  const [file, setFile] = useState<File | null>(null);
  const [fileSeconds, setFileSeconds] = useState<number | null>(null);
  const [checkingFile, setCheckingFile] = useState(false);
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [videoBusy, setVideoBusy] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [videoNotice, setVideoNotice] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);

  // Fill the form from the library once it is known — and again when a new
  // movement's id arrives after it is created.
  useEffect(() => {
    if (existing && loadedFor !== existing.id) {
      setForm(formFrom(existing));
      setHidden(!!existing.hidden);
      setLoadedFor(existing.id);
    }
  }, [existing, loadedFor]);

  // Leaving mid-upload stops it rather than finishing into a screen nobody sees.
  useEffect(() => () => abort.current?.abort(), []);

  const set = (key: TextKey) => (value: string) => setForm((current) => ({ ...current, [key]: value }));

  const problems: string[] = [];
  if (form.name.trim().length < 2) problems.push('Give it a name.');
  if (!form.category) problems.push('Pick a category.');

  const patch = existing ? changesBetween(form, formFrom(existing)) : null;
  const hiddenChanged = !!existing && hidden !== !!existing.hidden;
  const textDirty = isNew || hiddenChanged || (!!patch && Object.keys(patch).length > 0);
  const busy = saving || videoBusy || checkingFile;
  const hasVideo = !!existing?.video_url;

  const clearFile = () => {
    setFile(null);
    setFileSeconds(null);
  };

  const clearVideoMessages = () => {
    setVideoError(null);
    setVideoNotice(null);
  };

  const pick = async () => {
    clearVideoMessages();
    setConfirmRemove(false);
    const chosen = await chooseVideoFile();
    if (!chosen) return;
    setCheckingFile(true);
    try {
      const seconds = await checkVideoFile(chosen);
      setFile(chosen);
      setFileSeconds(seconds);
    } catch (err) {
      clearFile();
      setVideoError(describe(err));
    } finally {
      setCheckingFile(false);
    }
  };

  /** Uploads the chosen file onto a movement that already exists. */
  const uploadTo = async (exerciseId: string): Promise<Exercise> => {
    if (!file) throw new Error('Choose a video first.');
    const controller = new AbortController();
    abort.current = controller;
    try {
      const saved = await uploadExerciseVideo(exerciseId, file, setStage, controller.signal);
      library.remember(saved);
      clearFile();
      return saved;
    } finally {
      abort.current = null;
      setStage(null);
    }
  };

  const uploadVideo = async () => {
    if (!existing || !file || busy) return;
    const replacing = hasVideo;
    setVideoBusy(true);
    clearVideoMessages();
    try {
      const saved = await uploadTo(existing.id);
      setVideoNotice(
        replacing
          ? 'Video replaced. Clients see the new one from now on.'
          : saved.hidden
            ? 'Video uploaded. The exercise is still hidden from the picker.'
            : 'Video uploaded — this exercise can now be added to weeks.'
      );
    } catch (err) {
      setVideoError(
        err instanceof UploadCancelled
          ? replacing
            ? 'Upload cancelled. The current video is unchanged.'
            : 'Upload cancelled.'
          : replacing
            ? `${describe(err)} The current video is unchanged.`
            : describe(err)
      );
    } finally {
      setVideoBusy(false);
    }
  };

  const removeVideo = async () => {
    if (!existing || busy) return;
    setVideoBusy(true);
    clearVideoMessages();
    try {
      const saved = await adminApi.updateExercise(existing.id, { video_key: '' });
      library.remember(saved);
      setConfirmRemove(false);
      setVideoNotice('Video removed. This exercise is a draft until it has a new video.');
    } catch (err) {
      setVideoError(describe(err));
    } finally {
      setVideoBusy(false);
    }
  };

  const save = async () => {
    if (problems.length > 0 || busy || !textDirty) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      if (isNew) {
        const created = await adminApi.createExercise({
          name: form.name.trim(),
          category: form.category as string,
          focus: form.focus.trim() || undefined,
          suggested_sets: form.suggested_sets.trim() || undefined,
          prerequisites: form.prerequisites.trim() || undefined,
          instructions: form.instructions.trim() || undefined,
          purpose: form.purpose.trim() || undefined,
        });
        library.remember(created);
        // Same screen, now editing what was just created, so a retry after a
        // failed upload attaches to it instead of creating a second one.
        router.setParams({ id: created.id });

        if (file) {
          setVideoBusy(true);
          clearVideoMessages();
          try {
            await uploadTo(created.id);
            setNotice('Created. The video is live — this exercise can now be added to weeks.');
          } catch (err) {
            setNotice('Created as a draft.');
            setVideoError(
              err instanceof UploadCancelled
                ? 'Upload cancelled. Choose the video again to add it.'
                : `${describe(err)} Choose the video again to retry.`
            );
          } finally {
            setVideoBusy(false);
          }
        } else {
          setNotice('Created as a draft. Add a video to make it available.');
        }
      } else if (existing) {
        const saved = await adminApi.updateExercise(existing.id, { ...patch, ...(hiddenChanged ? { hidden } : {}) });
        library.remember(saved);
        setNotice('Saved.');
      }
    } catch (err) {
      setError(describe(err));
    } finally {
      setSaving(false);
    }
  };

  if (!isNew && !existing) {
    return (
      <Screen scroll>
        <PageHeader title="Exercise" onBack={dismiss} />
        <Card style={styles.missing}>
          <Text variant="caption" color="textSecondary" align="center">
            {library.loading ? 'Loading…' : 'This exercise is not in the library.'}
          </Text>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader
        title={isNew ? 'New Exercise' : form.name.trim() || 'Exercise'}
        subtitle={
          isNew
            ? 'Write it up, add the video, and it is ready for any client’s week.'
            : existing?.hidden
              ? 'Hidden from the picker'
              : hasVideo
                ? 'Live — coaches can add it to weeks'
                : 'Draft — needs a video before it can be used'
        }
        onBack={dismiss}
      />

      {readOnly ? (
        <Card variant="alt" style={styles.section}>
          <Text variant="caption" color="textSecondary">
            This server does not have the exercise library yet, so exercises cannot be edited here.
          </Text>
        </Card>
      ) : null}

      {/* ---- The demonstration ---- */}
      <Text variant="heading" style={styles.sectionTitle}>
        Video
      </Text>
      <Card style={styles.videoCard}>
        {hasVideo && existing ? (
          <View style={styles.videoBlock}>
            {file ? (
              <Text variant="label" color="textSecondary">
                CURRENT VIDEO — STAYS LIVE UNTIL THE NEW ONE IS UPLOADED
              </Text>
            ) : null}
            <VideoPoster
              key={existing.video_url}
              videoUrl={existing.video_url}
              posterUrl={existing.thumbnail_url}
              caption="What members see"
            />
          </View>
        ) : !file ? (
          <View style={styles.noVideo}>
            <Ionicons name="videocam-off-outline" size={26} color={theme.colors.textMuted} />
            <Text variant="caption" color="textSecondary" align="center">
              No video yet. It cannot go on anyone’s week until it has one.
            </Text>
          </View>
        ) : null}

        {file ? (
          <View
            style={[
              styles.fileRow,
              { borderColor: theme.colors.accentBorder, borderRadius: theme.radius.md, backgroundColor: theme.colors.accentSoft },
            ]}
          >
            <Ionicons name="film-outline" size={22} color={theme.colors.accent} />
            <View style={styles.fileText}>
              <Text variant="label" color="accentText">
                {hasVideo ? 'NEW VIDEO' : 'VIDEO TO UPLOAD'}
              </Text>
              <Text variant="bodyStrong" numberOfLines={1}>
                {file.name}
              </Text>
              <Text variant="caption" color="textSecondary">
                {formatSize(file.size)}
                {fileSeconds ? ` · ${formatDuration(fileSeconds)}` : ''}
                {isNew ? ' · uploads when you create the exercise' : ''}
              </Text>
            </View>
          </View>
        ) : null}

        {stage ? <UploadProgress stage={stage} onCancel={() => abort.current?.abort()} /> : null}

        {confirmRemove ? (
          <View style={[styles.confirm, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
            <Text variant="bodyStrong">Remove this video?</Text>
            <Text variant="caption" color="textSecondary">
              Clients who have this exercise will see “video coming soon” until you add a new one, and it leaves
              the picker until then. The name and instructions stay as they are.
            </Text>
          </View>
        ) : null}

        {videoError ? (
          <Text variant="caption" color="danger">
            {videoError}
          </Text>
        ) : null}
        {videoNotice ? (
          <Text variant="caption" color="accentText">
            {videoNotice}
          </Text>
        ) : null}

        {readOnly ? null : !canUploadHere ? (
          <Text variant="caption" color="textMuted" align="center">
            To add, replace or remove a video, open this page on the website.
          </Text>
        ) : isNew ? (
          <Button
            label={checkingFile ? 'Checking…' : file ? 'Choose a Different Video' : 'Choose Video'}
            variant="secondary"
            loading={checkingFile}
            disabled={busy}
            onPress={() => void pick()}
          />
        ) : confirmRemove ? (
          <View style={styles.buttonRow}>
            <Button
              label="Keep Video"
              variant="ghost"
              fullWidth={false}
              disabled={videoBusy}
              onPress={() => setConfirmRemove(false)}
              style={styles.rowButton}
            />
            <Button
              label="Remove Video"
              fullWidth={false}
              loading={videoBusy}
              onPress={() => void removeVideo()}
              style={styles.rowButton}
            />
          </View>
        ) : file ? (
          <View style={styles.buttonRow}>
            <Button
              label="Cancel"
              variant="ghost"
              fullWidth={false}
              disabled={videoBusy}
              onPress={() => {
                clearFile();
                clearVideoMessages();
              }}
              style={styles.rowButton}
            />
            <Button
              label={hasVideo ? 'Upload and Replace' : 'Upload Video'}
              fullWidth={false}
              loading={videoBusy}
              disabled={busy && !videoBusy}
              onPress={() => void uploadVideo()}
              style={styles.rowButton}
            />
          </View>
        ) : (
          <View style={styles.buttonRow}>
            {hasVideo ? (
              <Button
                label="Remove Video"
                variant="ghost"
                fullWidth={false}
                disabled={busy}
                onPress={() => {
                  clearVideoMessages();
                  setConfirmRemove(true);
                }}
                style={styles.rowButton}
              />
            ) : null}
            <Button
              label={checkingFile ? 'Checking…' : hasVideo ? 'Replace Video' : 'Upload Video'}
              variant="secondary"
              fullWidth={false}
              loading={checkingFile}
              disabled={busy}
              onPress={() => void pick()}
              style={styles.rowButton}
            />
          </View>
        )}

        {!readOnly && canUploadHere ? (
          <Text variant="caption" color="textMuted" align="center">
            MP4, up to {MAX_VIDEO_MB} MB. Clips sent over WhatsApp are already the right format. Sound is always
            muted for members.
          </Text>
        ) : null}
      </Card>

      {/* ---- The guide ---- */}
      <Text variant="heading" style={styles.sectionTitle}>
        Details
      </Text>
      <View style={styles.form}>
        <TextField label="NAME" value={form.name} onChangeText={set('name')} placeholder="Copenhagen Plank" maxLength={80} autoCapitalize="words" />

        <View style={styles.categoryBlock}>
          <Text variant="label" color="textSecondary">
            CATEGORY
          </Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {EXERCISE_CATEGORIES.map((category) => (
              <CategoryChip
                key={category}
                label={CATEGORY_LABEL[category]}
                active={form.category === category}
                onPress={() => setForm((current) => ({ ...current, category }))}
              />
            ))}
          </View>
        </View>

        <TextField label="WHAT IT WORKS" value={form.focus} onChangeText={set('focus')} placeholder="Adductors" maxLength={100} autoCapitalize="sentences" />
        <TextField label="DEFAULT SETS" value={form.suggested_sets} onChangeText={set('suggested_sets')} placeholder="3 x 20s each side" maxLength={80} autoCapitalize="none" />
        <TextField label="PREREQUISITES" value={form.prerequisites} onChangeText={set('prerequisites')} placeholder="None" maxLength={200} autoCapitalize="sentences" />
        <TextField
          label="INSTRUCTIONS"
          value={form.instructions}
          onChangeText={set('instructions')}
          placeholder="How to set up and do it, step by step."
          multiline
          minHeight={120}
          maxLength={2000}
          autoCapitalize="sentences"
        />
        <TextField
          label="PURPOSE"
          value={form.purpose}
          onChangeText={set('purpose')}
          placeholder="Why it is on the week — what it does for the member."
          multiline
          minHeight={100}
          maxLength={2000}
          autoCapitalize="sentences"
        />
      </View>

      {/* ---- Availability ---- */}
      {!isNew ? (
        <Card style={styles.section}>
          <View style={styles.switchRow}>
            <View style={styles.switchText}>
              <Text variant="bodyStrong">Hide from the picker</Text>
              <Text variant="caption" color="textSecondary">
                Coaches cannot add it to new weeks. Clients who already have it keep it.
              </Text>
            </View>
            <Switch
              value={hidden}
              onValueChange={setHidden}
              disabled={readOnly || busy}
              trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
              accessibilityLabel="Hide from the picker"
            />
          </View>
        </Card>
      ) : null}

      {problems.length > 0 && (form.name.length > 0 || !isNew) ? (
        <View style={styles.messages}>
          {problems.map((problem) => (
            <Text key={problem} variant="caption" color="danger">
              {problem}
            </Text>
          ))}
        </View>
      ) : null}
      {error ? (
        <Text variant="caption" color="danger" style={styles.messages}>
          {error}
        </Text>
      ) : null}
      {notice ? (
        <Text variant="caption" color="accentText" style={styles.messages}>
          {notice}
        </Text>
      ) : null}

      {readOnly ? null : (
        <Button
          label={isNew ? (file ? 'Create and Upload' : 'Create Exercise') : 'Save Changes'}
          disabled={problems.length > 0 || !textDirty || busy}
          loading={saving}
          onPress={() => void save()}
          style={styles.save}
        />
      )}
    </Screen>
  );
}

export default function ExerciseEditorRoute() {
  return (
    <RequirePermission permission="clients.assign_exercise" fallback="/(tabs)/clients">
      <ExerciseEditor />
    </RequirePermission>
  );
}

const styles = StyleSheet.create({
  missing: { marginTop: 24, paddingVertical: 28 },
  section: { marginTop: 20 },
  sectionTitle: { marginTop: 28, marginBottom: 12 },
  videoCard: { gap: 14 },
  videoBlock: { gap: 8 },
  noVideo: { alignItems: 'center', gap: 8, paddingVertical: 20 },
  fileRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, padding: 12 },
  fileText: { flex: 1, gap: 2 },
  confirm: { borderWidth: 1, padding: 14, gap: 6 },
  buttonRow: { flexDirection: 'row', gap: 10 },
  rowButton: { flex: 1 },
  progress: { gap: 8 },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
  form: { gap: 18 },
  categoryBlock: { gap: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1 },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  switchText: { flex: 1, gap: 2 },
  messages: { marginTop: 18, gap: 6 },
  save: { marginTop: 24, marginBottom: 12 },
});
