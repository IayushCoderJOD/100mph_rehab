import { useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, View } from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Line,
  Path,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { ISODate, formatShortDate } from '@/data';
import { useTheme } from '@/theme';
import { fontFamily } from '@/theme/typography';
import { Text } from '../ui/Text';

export type TrendPoint = {
  date: ISODate;
  score: number;
};

type PainTrendChartProps = {
  points: TrendPoint[];
  height?: number;
  selectedIndex?: number | null;
  onSelect?: (index: number) => void;
};

/** The scale is bounded, so the axis is too — never truncated to flatter a trend. */
const DOMAIN_MAX = 10;
const TICKS = [0, 5, 10];
const PAD = { top: 22, right: 16, bottom: 26, left: 26 };
/** Marker radius: an 8px mark, per the chart mark spec. */
const DOT = 4;
/** Minimum width of a point's touch band; below this the bands simply tile. */
const MIN_HIT = 24;

export function PainTrendChart({
  points,
  height = 190,
  selectedIndex = null,
  onSelect,
}: PainTrendChartProps) {
  const { theme } = useTheme();
  const [width, setWidth] = useState(0);
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);

  if (points.length === 0) {
    return (
      <View style={[styles.empty, { height }]}>
        <Text variant="caption" color="textMuted" align="center">
          Your pain trend appears here once you have logged a check-in.
        </Text>
      </View>
    );
  }

  const plotWidth = Math.max(0, width - PAD.left - PAD.right);
  const plotHeight = height - PAD.top - PAD.bottom;
  const baseline = PAD.top + plotHeight;

  const x = (index: number) =>
    points.length === 1
      ? PAD.left + plotWidth / 2
      : PAD.left + (index / (points.length - 1)) * plotWidth;
  const y = (score: number) => PAD.top + (1 - score / DOMAIN_MAX) * plotHeight;

  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.score)}`).join(' ');
  const area = `${line} L ${x(points.length - 1)} ${baseline} L ${x(0)} ${baseline} Z`;

  const lastIndex = points.length - 1;
  // Direct-label the endpoint, and whichever point is being inspected.
  const labelled = new Set([lastIndex, ...(selectedIndex !== null ? [selectedIndex] : [])]);

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 ? (
        <>
          <Svg width={width} height={height}>
            <Defs>
              <LinearGradient id="painFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={theme.colors.chartFill} stopOpacity={0.18} />
                <Stop offset="1" stopColor={theme.colors.chartFill} stopOpacity={0.02} />
              </LinearGradient>
            </Defs>

            {TICKS.map((tick) => (
              <Line
                key={tick}
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(tick)}
                y2={y(tick)}
                stroke={theme.colors.border}
                strokeWidth={1}
              />
            ))}

            {TICKS.map((tick) => (
              <SvgText
                key={`label-${tick}`}
                x={PAD.left - 8}
                y={y(tick) + 4}
                fill={theme.colors.textMuted}
                fontSize={10}
                fontFamily={fontFamily.regular}
                textAnchor="end"
              >
                {tick}
              </SvgText>
            ))}

            {points.length > 1 ? <Path d={area} fill="url(#painFill)" /> : null}

            {selectedIndex !== null && points[selectedIndex] ? (
              <Line
                x1={x(selectedIndex)}
                x2={x(selectedIndex)}
                y1={PAD.top}
                y2={baseline}
                stroke={theme.colors.borderStrong}
                strokeWidth={1}
              />
            ) : null}

            {points.length > 1 ? (
              <Path
                d={line}
                stroke={theme.colors.chartLine}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            ) : null}

            {points.map((point, index) => (
              <Circle
                key={point.date}
                cx={x(index)}
                cy={y(point.score)}
                r={index === selectedIndex ? DOT + 1.5 : DOT}
                fill={theme.colors.chartLine}
                // A surface ring keeps the mark legible where it crosses the line.
                stroke={theme.colors.surface}
                strokeWidth={2}
              />
            ))}

            {points.map((point, index) =>
              labelled.has(index) ? (
                <SvgText
                  key={`value-${point.date}`}
                  x={x(index)}
                  y={y(point.score) - 12}
                  fill={theme.colors.textPrimary}
                  fontSize={12}
                  fontFamily={fontFamily.medium}
                  textAnchor={index === lastIndex && points.length > 1 ? 'end' : 'middle'}
                >
                  {point.score}
                </SvgText>
              ) : null
            )}

            <SvgText
              x={PAD.left}
              y={height - 8}
              fill={theme.colors.textMuted}
              fontSize={10}
              fontFamily={fontFamily.regular}
              textAnchor="start"
            >
              {formatShortDate(points[0].date)}
            </SvgText>
            {points.length > 1 ? (
              <SvgText
                x={width - PAD.right}
                y={height - 8}
                fill={theme.colors.textMuted}
                fontSize={10}
                fontFamily={fontFamily.regular}
                textAnchor="end"
              >
                {formatShortDate(points[lastIndex].date)}
              </SvgText>
            ) : null}
          </Svg>

          {/*
            One full-height band per point rather than a dot-sized target: the
            bands tile the plot, so a tap always selects the nearest point and
            never lands in a gap between two of them.
          */}
          {onSelect
            ? points.map((point, index) => {
                const band =
                  points.length === 1
                    ? Math.max(MIN_HIT, plotWidth)
                    : Math.max(MIN_HIT, plotWidth / (points.length - 1));

                return (
                  <Pressable
                    key={`hit-${point.date}`}
                    onPress={() => onSelect(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`${formatShortDate(point.date)}, pain ${point.score} out of 10`}
                    style={[
                      styles.hit,
                      { left: x(index) - band / 2, width: band, top: PAD.top, height: plotHeight },
                    ]}
                  />
                );
              })
            : null}
        </>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  hit: { position: 'absolute' },
});
