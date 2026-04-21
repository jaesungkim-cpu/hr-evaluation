export const GRADE_RATIOS: Record<string, Record<string, number>> = {
  '팀원': {
    'S': 10,
    'A': 20,
    'B': 50,
    'C': 15,
    'D': 5,
  },
  '팀장급': {
    'S': 10,
    'A': 20,
    'B': 50,
    'C': 15,
    'D': 5,
  },
};

export const GRADES = ['S', 'A', 'B', 'C', 'D'] as const;
export const GRADES_LABEL: Record<string, string> = {
  'S': '우수',
  'A': '좋음',
  'B': '보통',
  'C': '미흡',
  'D': '부족',
};

export const PERFORMANCE_ITEMS = [
  { key: 'delivery', label: '납기(Delivery)', weight: 35 },
  { key: 'quality', label: '품질(Quality)', weight: 35 },
  { key: 'efficiency', label: '효율(Efficiency)', weight: 30 },
] as const;

export const COMPETENCY_ITEMS = [
  { key: 'leadership', label: '리더십(Leadership)', weight: 35 },
  { key: 'growth', label: '성장지향성(Growth)', weight: 35 },
  { key: 'ethics', label: '윤리의식(Ethics)', weight: 30 },
] as const;

export const LIKERT_SCALE = [
  { value: 1, label: '전혀 그렇지 않다' },
  { value: 2, label: '그렇지 않다' },
  { value: 3, label: '약간 그렇지 않다' },
  { value: 4, label: '보통이다' },
  { value: 5, label: '약간 그렇다' },
  { value: 6, label: '그렇다' },
  { value: 7, label: '매우 그렇다' },
] as const;

export const USER_ROLES: Record<string, string> = {
  'employee': '구성원',
  'first_evaluator': '1차 평가자',
  'second_evaluator': '2차 평가자',
  'ceo': '대표',
  'admin': '관리자',
};

export const GROUP_TYPES: Record<string, string> = {
  '팀원': '팀원',
  '팀장급': '팀장/센터장/실장',
};

export const EVALUATION_STATUS_LABEL: Record<string, string> = {
  'draft': '작성 중',
  'submitted': '제출됨',
  'approved': '승인됨',
  'rejected': '반려됨',
};

export const EVAL_PERIOD_STATUS: Record<string, string> = {
  'self': '자체 평가',
  'first': '1차 평가',
  'second': '2차 평가',
  'ceo': 'CEO 승인',
  'completed': '완료됨',
};

export const COMMENT_MIN_LENGTH = 50;

export const DEPARTMENTS = [
  '영업1본부',
  '영업2본부',
  'Digital본부',
  '운영본부',
  '경영진',
] as const;

export const POSITIONS = [
  '대표이사',
  '본부장',
  '센터장',
  '실장',
  '팀장',
  '사원',
] as const;

export const COLORS = {
  primary: '#1a365d',
  secondary: '#2b6cb0',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  light: '#f3f4f6',
  gradeS: '#ef4444',
  gradeA: '#f59e0b',
  gradeB: '#3b82f6',
  gradeC: '#8b5cf6',
  gradeD: '#6b7280',
} as const;

export const GRADE_COLORS: Record<string, string> = {
  'S': '#ef4444',
  'A': '#f59e0b',
  'B': '#3b82f6',
  'C': '#8b5cf6',
  'D': '#6b7280',
};
