import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { Tile } from '@/components/common';
import { LearnRail, LessonCard } from '@/components/learn';
import { Card, Screen, Text } from '@/components/ui';
import { groupLearnContent, mock } from '@/data';
import { useProgramData } from '@/program/programData';

export default function LearnScreen() {
  const router = useRouter();
  const { program, learnContent } = useProgramData();

  const { miniLessons, longform } = useMemo(
    () => groupLearnContent(learnContent),
    [learnContent]
  );

  const open = (id: string) => router.push(`/learn/${id}`);

  return (
    <Screen scroll>
      <Text variant="title" align="center" style={styles.pageTitle}>
        Learn
      </Text>

      <Card variant="alt" style={styles.intro}>
        <Text variant="heading">Understand the problem</Text>
        <Text variant="subtitle" color="textSecondary" style={styles.introNote}>
          The training rebuilds your back. This is where you learn why it works — which is what
          keeps people going in month four.
        </Text>
      </Card>

      {miniLessons.length > 0 ? (
        <LearnRail
          title="Mini Lessons"
          caption="One idea, under half a minute. Start here."
        >
          {miniLessons.map((item) => (
            <LessonCard key={item.id} content={item} onPress={() => open(item.id)} />
          ))}
        </LearnRail>
      ) : null}

      {/* The Long Answers rail, parked until the longform lessons are filmed.
          The grouping and the rail both work — there is just nothing worth
          sitting down for yet. Uncomment when the footage lands. */}
      {/* {longform.length > 0 ? (
        <LearnRail
          title="The Long Answers"
          caption="Sit down with these when you have the time."
        >
          {longform.map((item) => (
            <LessonCard key={item.id} content={item} onPress={() => open(item.id)} />
          ))}
        </LearnRail>
      ) : null} */}

      <LearnRail title="Learn About The Body" caption={`Beyond the ${program.name} program.`}>
        {mock.humanBodyTopics.map((topic) => (
          <Tile
            key={topic.id}
            icon={topic.icon}
            title={topic.title}
            subtitle={topic.subtitle}
            style={styles.topicTile}
          />
        ))}
      </LearnRail>

      <Text variant="caption" color="textMuted" align="center" style={styles.footnote}>
        New lessons are added as your physio records them.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  pageTitle: { marginTop: 12, marginBottom: 24 },
  intro: { marginBottom: 4 },
  introNote: { marginTop: 6 },
  topicTile: { width: 156, flexBasis: 'auto', flexGrow: 0 },
  footnote: { marginTop: 36, marginBottom: 8, paddingHorizontal: 24 },
});
