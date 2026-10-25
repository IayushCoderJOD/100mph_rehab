import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Switch, View } from 'react-native';
import { RequirePermission } from '@/access';
import { ApiError, UpdateExercisePayload, adminApi, messageFor } from '@/api';
import { PageHeader } from '@/components/common';
import { TextField } from '@/components/form';
import { VideoPoster } from '@/components/session';
import { Button, Card, Loader, Screen, Text } from '@/components/ui';
import { EXERCISE_CATEGORIES, Exercise, ExerciseCategory } from '@/data';
import {
  MAX_SOURCE_MINUTES,
  UploadCancelled,
  UploadResult,
  UploadStage,
  VIDEO_ACCEPT,
  VideoPlan,
  canUploadHere,
  checkVideoFile,
  uploadExerciseVideo,
  useExerciseLibrary,
} from '@/exercises';
import { useHover } from '@/hooks/useHover';
import { strings, useI18n } from '@/i18n';
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

/** What will happen to the chosen file, in a line. */
function describePlan(plan: VideoPlan, keepSound: boolean): string {
  const copy = strings().exerciseEditor;
  if (plan.action === 'copy') return keepSound ? copy.planCopy : copy.planCopyMuted;
  if (!plan.target) return copy.planConvert;
  const shrinking = plan.target.width < plan.width || plan.target.height < plan.height;
  const short = Math.min(plan.target.width, plan.target.height);
  return shrinking ? copy.planResize(short) : copy.planCompress;
}

/** Tells the admin up front when the slow converter is the one that will run, and what to do about it. */
function slowWarning(plan: VideoPlan, keepSound: boolean): string | null {
  const copy = strings().exerciseEditor;
  if (plan.action === 'compress' && plan.slow) {
    return copy.slowVideo(plan.codecLabel ? copy.codecVideo(plan.codecLabel) : copy.unknownVideo);
  }
  if (keepSound && plan.soundSlow) return copy.slowSound;
  return null;
}

/** What to add to the "uploaded" message: how much smaller it got, and a clip that turned out to have no sound. */
function resultNote(original: File, result: UploadResult, keepSound: boolean): string {
  const copy = strings().exerciseEditor;
  const size =
    result.compressed && result.sentBytes < original.size
      ? copy.compressed(formatSize(original.size), formatSize(result.sentBytes))
      : '';
  const silent = keepSound && !result.hasSound ? copy.silentClip : '';
  return size + silent;
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

function formatWait(seconds: number): string {
  const copy = strings().exerciseEditor;
  if (seconds < 50) return copy.waitUnderMinute;
  const minutes = Math.round(seconds / 60);
  return minutes <= 1 ? copy.waitMinute : copy.waitMinutes(minutes);
}

function stageLabel(stage: UploadStage): string {
  const copy = strings().exerciseEditor;
  switch (stage.step) {
    case 'checking':
      return copy.stageChecking;
    case 'loading':
      return copy.stageLoading(Math.round(stage.progress * 100));
    case 'compressing':
      return (
        copy.stageCompressing(Math.round(stage.progress * 100)) +
        (stage.secondsLeft != null ? copy.stageLeft(formatWait(stage.secondsLeft)) : '')
      );
    case 'uploading':
      return copy.stageUploading(Math.round(stage.progress * 100));
    case 'saving':
      return copy.stageSaving;
  }
}

function UploadProgress({ stage, onCancel }: { stage: UploadStage; onCancel: () => void }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const fraction = stage.step === 'saving' ? 1 : stage.step === 'checking' ? 0 : stage.progress;
  const label = stageLabel(stage);

  return (
    <View style={styles.progress} accessibilityLiveRegion="polite">
      <View style={styles.progressHead}>
        <Text variant="caption" color="textSecondary">
          {label}
        </Text>
        {stage.step !== 'saving' ? (
          <Pressable onPress={onCancel} hitSlop={8} accessibilityRole="button">
            <Text variant="label" color="accent">
              {t.exerciseEditor.cancel}
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

function SwitchRow({
  title,
  caption,
  value,
  onValueChange,
  disabled,
}: {
  title: string;
  caption: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled: boolean;
}) {
  const { theme } = useTheme();
  return (
    <View style={styles.switchRow}>
      <View style={styles.switchText}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="caption" color="textSecondary">
          {caption}
        </Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: theme.colors.accent, false: theme.colors.borderStrong }}
        accessibilityLabel={title}
      />
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
 * saves text; the video has its own actions — upload, replace, remove, sound
 * on or off — each of which finishes on its own. So replacing a video never touches the name or
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
  const { t } = useI18n();
  const copy = t.exerciseEditor;

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
  const [filePlan, setFilePlan] = useState<VideoPlan | null>(null);
  /** Keep the chosen file's sound. Off unless the video it replaces had sound on. */
  const [keepSound, setKeepSound] = useState(false);
  /** The sound switch's new position while it saves, so it moves the moment it is tapped. */
  const [soundSaving, setSoundSaving] = useState<boolean | null>(null);
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
  if (form.name.trim().length < 2) problems.push(copy.needName);
  if (!form.category) problems.push(copy.needCategory);

  const patch = existing ? changesBetween(form, formFrom(existing)) : null;
  const hiddenChanged = !!existing && hidden !== !!existing.hidden;
  const textDirty = isNew || hiddenChanged || (!!patch && Object.keys(patch).length > 0);
  const busy = saving || videoBusy || checkingFile;
  const hasVideo = !!existing?.video_url;
  const fileHasSound = filePlan?.hasSound !== false;
  const slowNote = file && filePlan ? slowWarning(filePlan, keepSound && fileHasSound) : null;
  const soundOn = soundSaving ?? !!existing?.sound_on;

  const clearFile = () => {
    setFile(null);
    setFilePlan(null);
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
      const plan = await checkVideoFile(chosen);
      setFile(chosen);
      setFilePlan(plan);
      setKeepSound(!!existing?.sound_on && plan.hasSound !== false);
    } catch (err) {
      clearFile();
      setVideoError(describe(err));
    } finally {
      setCheckingFile(false);
    }
  };

  /** Converts and uploads the chosen file onto a movement that already exists. */
  const uploadTo = async (exerciseId: string): Promise<UploadResult> => {
    if (!file) throw new Error(copy.chooseFirst);
    const controller = new AbortController();
    abort.current = controller;
    try {
      const result = await uploadExerciseVideo(exerciseId, file, keepSound && fileHasSound, setStage, controller.signal);
      library.remember(result.exercise);
      clearFile();
      return result;
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
      const result = await uploadTo(existing.id);
      setVideoNotice(
        (replacing ? copy.replaced : result.exercise.hidden ? copy.uploadedHidden : copy.uploadedLive) +
          resultNote(file, result, keepSound)
      );
    } catch (err) {
      setVideoError(
        err instanceof UploadCancelled
          ? replacing
            ? copy.cancelledKept
            : copy.cancelled
          : replacing
            ? copy.failedKept(describe(err))
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
      setVideoNotice(copy.removed);
    } catch (err) {
      setVideoError(describe(err));
    } finally {
      setVideoBusy(false);
    }
  };

  /** Mutes or unmutes the current video for members. The file is not touched. */
  const setSound = async (on: boolean) => {
    if (!existing || busy) return;
    setSoundSaving(on);
    setVideoBusy(true);
    clearVideoMessages();
    try {
      const saved = await adminApi.updateExercise(existing.id, { sound_on: on });
      library.remember(saved);
      setVideoNotice(on ? copy.soundOnNotice : copy.mutedNotice);
    } catch (err) {
      setVideoError(describe(err));
    } finally {
      setSoundSaving(null);
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
            const result = await uploadTo(created.id);
            setNotice(copy.createdLive + resultNote(file, result, keepSound));
          } catch (err) {
            setNotice(copy.createdDraft);
            setVideoError(err instanceof UploadCancelled ? copy.createCancelled : copy.createRetry(describe(err)));
          } finally {
            setVideoBusy(false);
          }
        } else {
          setNotice(copy.createdNeedsVideo);
        }
      } else if (existing) {
        const saved = await adminApi.updateExercise(existing.id, { ...patch, ...(hiddenChanged ? { hidden } : {}) });
        library.remember(saved);
        setNotice(copy.saved);
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
        <PageHeader title={copy.exercise} onBack={dismiss} />
        {library.loading ? (
          <Loader />
        ) : (
          <Card style={styles.missing}>
            <Text variant="caption" color="textSecondary" align="center">
              {copy.notInLibrary}
            </Text>
          </Card>
        )}
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAvoiding>
      <PageHeader
        // The name as stored, not translated: this is the screen that edits it.
        title={isNew ? copy.newTitle : form.name.trim() || copy.exercise}
        subtitle={
          isNew ? copy.newSub : existing?.hidden ? copy.hiddenSub : hasVideo ? copy.liveSub : copy.draftSub
        }
        onBack={dismiss}
      />

      {readOnly ? (
        <Card variant="alt" style={styles.section}>
          <Text variant="caption" color="textSecondary">
            {copy.readOnly}
          </Text>
        </Card>
      ) : null}

      {/* ---- The demonstration ---- */}
      <Text variant="heading" style={styles.sectionTitle}>
        {copy.video}
      </Text>
      <Card style={styles.videoCard}>
        {hasVideo && existing ? (
          <View style={styles.videoBlock}>
            {file ? (
              <Text variant="label" color="textSecondary">
                {copy.currentStays}
              </Text>
            ) : null}
            <VideoPoster
              key={existing.video_url}
              videoUrl={existing.video_url}
              posterUrl={existing.thumbnail_url}
              caption={copy.whatMembersSee}
              sound={soundOn}
            />
            {!file && !confirmRemove ? (
              <SwitchRow
                title={copy.playWithSound}
                caption={!existing.video_has_sound ? copy.noSoundTrack : soundOn ? copy.soundOnCaption : copy.mutedCaption}
                value={soundOn}
                onValueChange={(on) => void setSound(on)}
                disabled={readOnly || busy || !existing.video_has_sound}
              />
            ) : null}
          </View>
        ) : !file ? (
          <View style={styles.noVideo}>
            <Ionicons name="videocam-off-outline" size={26} color={theme.colors.textMuted} />
            <Text variant="caption" color="textSecondary" align="center">
              {copy.noVideo}
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
                {hasVideo ? copy.newVideo : copy.toUpload}
              </Text>
              <Text variant="bodyStrong" numberOfLines={1}>
                {file.name}
              </Text>
              <Text variant="caption" color="textSecondary">
                {formatSize(file.size)}
                {filePlan?.durationSec ? ` · ${formatDuration(filePlan.durationSec)}` : ''}
                {isNew ? copy.uploadsOnCreate : ''}
              </Text>
              {filePlan && !stage ? (
                <Text variant="caption" color="textSecondary">
                  {describePlan(filePlan, keepSound && fileHasSound)}
                </Text>
              ) : null}
            </View>
          </View>
        ) : null}

        {file && filePlan ? (
          <SwitchRow
            title={copy.keepSound}
            caption={!fileHasSound ? copy.clipNoSound : keepSound ? copy.keepSoundOn : copy.keepSoundOff}
            value={keepSound && fileHasSound}
            onValueChange={setKeepSound}
            disabled={busy || !fileHasSound}
          />
        ) : null}

        {slowNote ? (
          <Text variant="caption" color="textSecondary">
            {slowNote}
          </Text>
        ) : null}

        {stage ? <UploadProgress stage={stage} onCancel={() => abort.current?.abort()} /> : null}

        {confirmRemove ? (
          <View style={[styles.confirm, { borderColor: theme.colors.border, borderRadius: theme.radius.md }]}>
            <Text variant="bodyStrong">{copy.removeTitle}</Text>
            <Text variant="caption" color="textSecondary">
              {copy.removeNote}
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
            {copy.websiteOnly}
          </Text>
        ) : isNew ? (
          <Button
            label={checkingFile ? copy.checking : file ? copy.chooseDifferent : copy.chooseVideo}
            variant="secondary"
            loading={checkingFile}
            disabled={busy}
            onPress={() => void pick()}
          />
        ) : confirmRemove ? (
          <View style={styles.buttonRow}>
            <Button
              label={copy.keepVideo}
              variant="ghost"
              fullWidth={false}
              disabled={videoBusy}
              onPress={() => setConfirmRemove(false)}
              style={styles.rowButton}
            />
            <Button
              label={copy.removeVideo}
              fullWidth={false}
              loading={videoBusy}
              onPress={() => void removeVideo()}
              style={styles.rowButton}
            />
          </View>
        ) : file ? (
          <View style={styles.buttonRow}>
            <Button
              label={copy.cancel}
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
              label={hasVideo ? copy.uploadReplace : copy.uploadVideo}
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
                label={copy.removeVideo}
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
              label={checkingFile ? copy.checking : hasVideo ? copy.replaceVideo : copy.uploadVideo}
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
            {copy.uploadHelp(MAX_SOURCE_MINUTES)}
          </Text>
        ) : null}
      </Card>

      {/* ---- The guide ---- */}
      <Text variant="heading" style={styles.sectionTitle}>
        {copy.details}
      </Text>
      <View style={styles.form}>
        <TextField label={copy.name} value={form.name} onChangeText={set('name')} placeholder="Copenhagen Plank" maxLength={80} autoCapitalize="words" />

        <View style={styles.categoryBlock}>
          <Text variant="label" color="textSecondary">
            {copy.category}
          </Text>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {EXERCISE_CATEGORIES.map((category) => (
              <CategoryChip
                key={category}
                label={t.categories[category]}
                active={form.category === category}
                onPress={() => setForm((current) => ({ ...current, category }))}
              />
            ))}
          </View>
        </View>

        <TextField label={copy.focus} value={form.focus} onChangeText={set('focus')} placeholder="Adductors" maxLength={100} autoCapitalize="sentences" />
        <TextField label={copy.sets} value={form.suggested_sets} onChangeText={set('suggested_sets')} placeholder="3 x 20s each side" maxLength={80} autoCapitalize="none" />
        <TextField label={copy.prerequisites} value={form.prerequisites} onChangeText={set('prerequisites')} placeholder="None" maxLength={200} autoCapitalize="sentences" />
        <TextField
          label={copy.instructions}
          value={form.instructions}
          onChangeText={set('instructions')}
          placeholder={copy.instructionsPlaceholder}
          multiline
          minHeight={120}
          maxLength={2000}
          autoCapitalize="sentences"
        />
        <TextField
          label={copy.purpose}
          value={form.purpose}
          onChangeText={set('purpose')}
          placeholder={copy.purposePlaceholder}
          multiline
          minHeight={100}
          maxLength={2000}
          autoCapitalize="sentences"
        />
      </View>

      {/* ---- Availability ---- */}
      {!isNew ? (
        <Card style={styles.section}>
          <SwitchRow
            title={copy.hide}
            caption={copy.hideNote}
            value={hidden}
            onValueChange={setHidden}
            disabled={readOnly || busy}
          />
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
          label={isNew ? (file ? copy.createUpload : copy.create) : copy.save}
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
