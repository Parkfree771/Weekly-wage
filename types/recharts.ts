/**
 * Recharts 커스텀 컴포넌트 타입 정의
 */

// 차트 데이터 타입
export type ChartDataPoint = {
  날짜: string;
  가격: number;
  비교가격?: number;
  rawTime: number;
  isWednesday: boolean;
  fullDate: Date;
  eventLabel?: string;
  eventColor?: string;
  hasEvent: boolean;
};

// 툴팁 props 타입
export type TooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: ChartDataPoint;
    value?: number;
    dataKey?: string;
    name?: string;
    color?: string;
  }>;
  label?: string;
};

// 커스텀 Dot props 타입
export type CustomDotProps = {
  cx?: number;
  cy?: number;
  payload?: ChartDataPoint;
  value?: number;
  dataKey?: string;
  index?: number;
};

// Customized 컴포넌트 props 타입
export type CustomizedProps = {
  xAxisMap?: Record<string, {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: (value: number) => number;
  }>;
  yAxisMap?: Record<string, {
    x: number;
    y: number;
    width: number;
    height: number;
    scale: (value: number) => number;
  }>;
};
