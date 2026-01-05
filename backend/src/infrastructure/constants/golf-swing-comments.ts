/**
 * 골프 스윙 분석 결과 멘트 상수
 * CSV 파일 기반으로 생성됨
 *
 * 멘트 레벨:
 * 1 = 좋음 (점수 75% 초과)
 * 2 = 보통/개선필요 (점수 75% 이하, 양수 방향)
 * 3 = 나쁨/개선필요 (점수 75% 이하, 음수 방향)
 */

export interface SwingComment {
  ko: string;
  en: string;
}

export interface ItemComments {
  1: SwingComment;
  2: SwingComment;
  3?: SwingComment;  // 2레벨만 있는 항목도 있음
}

export interface PhaseComments {
  [itemKey: string]: ItemComments;
}

export const GOLF_SWING_COMMENTS: { [phase: string]: PhaseComments } = {
  // ========================================
  // 1. 어드레스 (Address)
  // ========================================
  address: {
    shoulder_tilt: {
      1: { ko: '기울기가 잘 유지돼요!', en: 'The tilt is well maintained!' },
      2: { ko: '기울기가 너무 커요! 조금 줄여볼까요?', en: 'The tilt is too steep! Shall we reduce it a bit?' },
      3: { ko: '오른쪽이 높은건 좋지 않아요.. 조금 각도를 바꿔볼까요?', en: 'The right side being high is not good.. Shall we adjust the angle a little?' },
    },
    stance: {
      1: { ko: '스탠스가 딱 좋아요', en: 'The stance is just right.' },
      2: { ko: '스탠스가 너무 좁아요. 조금 넓혀볼까요?', en: 'The stance is too narrow. Shall we widen it a bit?' },
      3: { ko: '스탠스가 너무 넓어요. 조금 좁혀볼까요?', en: 'The stance is too wide. Shall we narrow it a bit?' },
    },
    upper_body_tilt: {
      1: { ko: '상체 기울임이 적당해요!', en: 'Your upper body tilt is just right!' },
      2: { ko: '상체 기울임이 부족해요. 상체를 더 기울여 볼까요?', en: 'Your upper body tilt is insufficient. Shall we try tilting it a bit more?' },
      3: { ko: '상체 기울임이 너무 커요. 상체를 살짝 세워 볼까요?', en: 'Your upper body tilt is too much. Shall we try straightening up a bit?' },
    },
  },

  // ========================================
  // 2. 테이크백 (Takeback)
  // ========================================
  takeback: {
    left_shoulder_rotation: {
      1: { ko: '어깨 회전이 딱 좋아요! 이대로 유지해볼까요?', en: 'The shoulder rotation is just right! Shall we maintain it like this?' },
      2: { ko: '어깨 회전이 너무 많아요.. 조금 줄여볼까요?', en: 'The shoulder rotation is too much.. Shall we reduce it a bit?' },
      3: { ko: '어깨를 조금 더 회전해볼까요?', en: 'Shall we rotate the shoulders a little more?' },
    },
    left_arm_flexion: {
      1: { ko: '왼쪽 팔이 잘 펴져있어요! Good!', en: 'The left arm is well extended! Good!' },
      2: { ko: '왼팔이 너무 펴져있어요! 자연스럽게 구부려볼까요?', en: 'The left arm is too straight! Shall we bend it a little naturally?' },
      3: { ko: '왼팔이 다소 구부러져 있어요! 쭉 펴볼까요?', en: 'The left arm is a bit bent! Shall we extend it fully?' },
    },
    right_arm_flexion: {
      1: { ko: '오른쪽 팔이 잘 펴져있어요! Good!', en: 'The right arm is well extended! Good!' },
      2: { ko: '오른팔이 너무 펴져있어요! 자연스럽게 구부려볼까요?', en: 'The right arm is too straight! Shall we bend it a little naturally?' },
      3: { ko: '오른팔이 다소 구부러져 있어요! 쭉 펴볼까요?', en: 'The right arm is a bit bent! Shall we extend it fully?' },
    },
    right_hip_rotation: {
      1: { ko: '골반 회전이 딱 적당해요! Good!', en: 'The pelvis rotation is just right! Good!' },
      2: { ko: '골반 회전이 다소 부족해요! 조금 더 골반을 움직여볼까요?', en: 'The pelvis rotation is a bit lacking! Shall we move the pelvis a bit more?' },
      3: { ko: '골반 회전이 너무 과해요! 골반 가동범위를 조금 줄여볼까요?', en: 'The pelvis rotation is too much! Shall we reduce the pelvis range of motion?' },
    },
  },

  // ========================================
  // 3. 백스윙 (Backswing)
  // ========================================
  backswing: {
    head_location: {
      1: { ko: '머리 위치가 잘 고정되어 있어요!', en: 'Your head position is well stabilized!' },
      2: { ko: '머리 위치가 너무 위에 있어요!', en: 'Your head position is too high!' },
      3: { ko: '머리 위치가 너무 아래에 있어요!', en: 'Your head position is too low!' },
    },
    left_shoulder_rotation: {
      1: { ko: '어깨 회전이 딱 적당해요! Good!', en: 'The shoulder rotation is just perfect! Good!' },
      2: { ko: '어깨 회전이 너무 많아요.. 조금 줄여볼까요?', en: 'The shoulder rotation is too much.. Shall we reduce it a bit?' },
      3: { ko: '어깨를 조금 더 회전해볼까요?', en: 'Shall we rotate the shoulders a little more?' },
    },
    left_arm_flexion: {
      1: { ko: '왼쪽 팔이 잘 펴져있어요! Good!', en: 'The left arm is well extended! Good!' },
      2: { ko: '왼팔이 너무 펴져있어요! 자연스럽게 구부려볼까요?', en: 'The left arm is too straight! Shall we bend it a little naturally?' },
      3: { ko: '왼팔이 다소 구부러져 있어요! 쭉 펴볼까요?', en: 'The left arm is a bit bent! Shall we extend it fully?' },
    },
  },

  // ========================================
  // 4. 백스윙탑 (Backswingtop)
  // ========================================
  backswingtop: {
    reverse_spine: {
      1: { ko: '리버스스파인이 발생하지 않았어요! Good!', en: "There's no reverse spine tilt! Good job!" },
      2: { ko: '몸이 너무 뒤로 젖혀지거나 앞으로 굽혀졌어요!', en: 'Your body is leaning too far back or bending too far forward!' },
    },
    right_leg_flexion: {
      1: { ko: '오른쪽 다리가 잘 펴져있어요! Good!', en: 'The right leg is well extended! Good!' },
      2: { ko: '오른쪽 다리가 다소 구부러져 있어요! 쭉 펴볼까요?', en: 'The right leg is too straight! Shall we bend it a bit naturally?' },
    },
    head_location: {
      1: { ko: '머리 위치가 잘 고정되어 있어요!', en: 'Your head position is well stabilized!' },
      2: { ko: '머리 위치가 너무 위에 있어요!', en: 'Your head position is too high!' },
      3: { ko: '머리 위치가 너무 아래에 있어요!', en: 'Your head position is too low!' },
    },
    right_hip_rotation: {
      1: { ko: '골반 회전이 딱 적당해요! Good!', en: 'The pelvis rotation is just right! Good!' },
      2: { ko: '골반 회전이 다소 부족해요! 조금 더 골반을 움직여볼까요?', en: 'The pelvis rotation is a bit lacking! Shall we move the pelvis a bit more?' },
      3: { ko: '골반 회전이 너무 과해요! 골반 가동범위를 조금 줄여볼까요?', en: 'The pelvis rotation is too much! Shall we reduce the pelvis range of motion?' },
    },
    center_of_gravity: {
      1: { ko: '체중이동이 너무 좋네요! 자연스러워요!', en: 'The weight shift is very good! Natural!' },
      2: { ko: '체중이 오른발쪽에 남아있어요. 자연스럽게 넘겨볼까요?', en: 'The weight is remaining on the right foot. Shall we shift it naturally?' },
      3: { ko: '스웨이가 발생했어요. 조금 오른발 쪽에 체중을 남겨볼까요?', en: 'There is a sway happening. Shall we leave some weight on the right foot?' },
    },
  },

  // ========================================
  // 5. 다운스윙 (Downswing)
  // ========================================
  downswing: {
    center_of_gravity: {
      1: { ko: '체중이동이 너무 좋네요! 자연스러워요!', en: 'The weight shift is very good! Natural!' },
      2: { ko: '체중이 오른발쪽에 남아있어요. 자연스럽게 넘겨볼까요?', en: 'The weight is remaining on the right foot. Shall we shift it naturally?' },
      3: { ko: '스웨이가 발생했어요. 조금 오른발 쪽에 체중을 남겨볼까요?', en: 'There is a sway happening. Shall we leave some weight on the right foot?' },
    },
    right_elbow_location: {
      1: { ko: '오른팔꿈치가 왼팔꿈치보다 아래에 있어요! Good!', en: 'Your right elbow is below your left elbow! Good job!' },
      2: { ko: '오른팔꿈치를 더 내려 볼까요?', en: 'Shall we lower your right elbow a bit more?' },
    },
    right_arm_rotation: {
      1: { ko: '오른팔이 몸과 잘 붙어 있어요!', en: 'Your right arm is well aligned with your body!' },
      2: { ko: '오른팔이 몸과 떨어져 있어요! 팔을 몸에 더 붙여 볼까요?', en: 'Your right arm is away from your body! Shall we try bringing it closer?' },
    },
  },

  // ========================================
  // 6. 임팩트 (Impact)
  // ========================================
  impact: {
    head_location: {
      1: { ko: '머리 위치가 잘 고정되어 있어요!', en: 'Your head position is well stabilized!' },
      2: { ko: '머리 위치가 너무 위에 있어요!', en: 'Your head position is too high!' },
      3: { ko: '머리 위치가 너무 아래에 있어요!', en: 'Your head position is too low!' },
    },
    hanging_back: {
      1: { ko: '무게 중심이 잘 이동되었어요!', en: 'Your weight shift is well executed!' },
      2: { ko: '무게 중심이 아직 오른쪽에 많이 남아 있어요! 더 이동해 볼까요?', en: 'Your weight is still mostly on the right side! Shall we try shifting it more?' },
    },
    left_arm_flexion: {
      1: { ko: '왼쪽 팔이 잘 펴져있어요! Good!', en: 'The left arm is well extended! Good!' },
      2: { ko: '왼팔이 너무 펴져있어요! 자연스럽게 구부려볼까요?', en: 'The left arm is too straight! Shall we bend it a little naturally?' },
      3: { ko: '왼팔이 다소 구부러져 있어요! 쭉 펴볼까요?', en: 'The left arm is a bit bent! Shall we extend it fully?' },
    },
    right_arm_flexion: {
      1: { ko: '오른쪽 팔이 잘 펴져있어요! Good!', en: 'The right arm is well extended! Good!' },
      2: { ko: '오른팔이 너무 펴져있어요! 자연스럽게 구부려볼까요?', en: 'The right arm is too straight! Shall we bend it a little naturally?' },
      3: { ko: '오른팔이 다소 구부러져 있어요! 쭉 펴볼까요?', en: 'The right arm is a bit bent! Shall we extend it fully?' },
    },
  },

  // ========================================
  // 7. 팔로우스루 (Follow)
  // ========================================
  follow: {
    left_line_align: {
      1: { ko: '왼쪽다리가 잘 펴졌어요! Good!', en: 'The left leg is well extended! Good!' },
      2: { ko: '왼쪽 다리가 살짝 구부러져 있어요. 쭉 펴볼까요?', en: 'The left leg is slightly bent. Shall we extend it fully?' },
      3: { ko: '왼쪽 다리가 다소 구부러져 있어요! 쭉 펴볼까요?', en: 'The left leg is a bit bent. Shall we extend it fully?' },
    },
    chicken_wing: {
      1: { ko: '왼쪽 팔이 잘 펴져있어요! Good!', en: 'The left arm is well extended! Good!' },
      2: { ko: '왼팔이 너무 펴져있어요! 자연스럽게 구부려볼까요?', en: 'The left arm is too straight! Shall we bend it a little naturally?' },
      3: { ko: '왼팔이 다소 구부러져 있어요! 쭉 펴볼까요?', en: 'The left arm is a bit bent! Shall we extend it fully?' },
    },
    center_of_gravity: {
      1: { ko: '체중이동이 아주 자연스럽네요! Good!', en: 'The weight shift is very natural! Good!' },
      2: { ko: '무게중심이 아직 오른발에 남아있어요. 자연스럽게 넘겨볼까요?', en: 'The weight is still on the right foot. Shall we shift it naturally?' },
      3: { ko: '체중이동이 너무 많이 진행되었어요. 조금 남겨볼까요?', en: 'The weight shift has progressed too much. Shall we leave a bit behind?' },
    },
  },

  // ========================================
  // 8. 피니시 (Finish)
  // ========================================
  finish: {
    center_of_gravity: {
      1: { ko: '왼쪽 발목과 오른쪽 골반의 정렬이 딱 좋아요! Good!', en: 'The alignment of the left ankle and right pelvis is just right! Good!' },
      2: { ko: '왼쪽 발목과 오른쪽 골반의 정렬에 조금 신경 써볼까요?', en: 'Shall we pay a little attention to the alignment of the left ankle and right pelvis?' },
    },
    right_foot_rotation: {
      1: { ko: '오른발의 각도가 딱 좋아요! 이대로 계속 쳐 볼까요?', en: 'The angle of the right foot is perfect! Shall we keep hitting like this?' },
      2: { ko: '오른쪽 발 각도가 다소 아쉬워요! 오른발 각도에 신경써볼까요?', en: 'The right foot angle is a bit off! Shall we pay attention to the right foot angle?' },
    },
    left_foot_fix: {
      1: { ko: '왼발이 안정적으로 고정되어있어요!', en: 'The left foot is stably fixed!' },
      2: { ko: '왼발이 더 고정되어야 해요! 왼발 고정에 더 신경써볼까요?', en: 'The left foot needs to be more fixed! Shall we pay more attention to fixing the left foot?' },
    },
  },
};

/**
 * 멘트 조회 헬퍼 함수
 */
export function getComment(
  phase: string,
  item: string,
  level: 1 | 2 | 3,
  lang: 'ko' | 'en' = 'ko',
): string {
  const phaseComments = GOLF_SWING_COMMENTS[phase];
  if (!phaseComments) return '';

  const itemComments = phaseComments[item];
  if (!itemComments) return '';

  const comment = itemComments[level];
  if (!comment) {
    // 3레벨이 없는 경우 2레벨 반환
    const fallback = itemComments[2];
    return fallback ? fallback[lang] : '';
  }

  return comment[lang];
}

/**
 * 전체 Phase 멘트 조회
 */
export function getPhaseComments(phase: string, lang: 'ko' | 'en' = 'ko'): { [item: string]: string[] } {
  const phaseComments = GOLF_SWING_COMMENTS[phase];
  if (!phaseComments) return {};

  const result: { [item: string]: string[] } = {};
  for (const [item, comments] of Object.entries(phaseComments)) {
    result[item] = [
      comments[1][lang],
      comments[2][lang],
      comments[3] ? comments[3][lang] : '',
    ].filter(c => c);
  }
  return result;
}
