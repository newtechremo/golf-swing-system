import { Injectable } from '@nestjs/common';
import { getComment } from '../constants/golf-swing-comments';

/**
 * 점수 계산 결과 인터페이스
 */
export interface ScoreResult {
  score: number;        // 0-100 점수
  mentLevel: 1 | 2 | 3; // 멘트 레벨
  comment: string;      // 해당하는 멘트
}

/**
 * 항목별 이상적 범위 설정
 * optimal: 이상적인 값 또는 범위
 * tolerance: 허용 오차 (이 범위 내면 좋은 점수)
 * maxDeviation: 최대 편차 (이 값을 넘으면 0점)
 */
interface ItemConfig {
  optimal: number;          // 이상적인 값
  tolerance: number;        // 허용 오차 (±)
  maxDeviation: number;     // 최대 편차
  invertSign?: boolean;     // 부호 반전 여부 (음수가 좋은 경우)
  hasThirdLevel?: boolean;  // 3번 멘트 사용 여부
}

/**
 * 각 항목별 설정값
 * 실제 프로 골퍼 데이터 기반으로 조정 필요
 */
const ITEM_CONFIGS: { [phase: string]: { [item: string]: ItemConfig } } = {
  address: {
    shoulder_tilt: { optimal: 0, tolerance: 5, maxDeviation: 20, hasThirdLevel: true },
    stance: { optimal: 0, tolerance: 10, maxDeviation: 40, hasThirdLevel: true },
    upper_body_tilt: { optimal: 30, tolerance: 10, maxDeviation: 30, hasThirdLevel: true },
  },
  takeback: {
    left_shoulder_rotation: { optimal: 45, tolerance: 15, maxDeviation: 45, hasThirdLevel: true },
    left_arm_flexion: { optimal: 170, tolerance: 10, maxDeviation: 30, hasThirdLevel: true },
    right_arm_flexion: { optimal: 170, tolerance: 10, maxDeviation: 30, hasThirdLevel: true },
    right_hip_rotation: { optimal: 15, tolerance: 10, maxDeviation: 30, hasThirdLevel: true },
  },
  backswing: {
    head_location: { optimal: 0, tolerance: 5, maxDeviation: 20, hasThirdLevel: true },
    left_shoulder_rotation: { optimal: 60, tolerance: 15, maxDeviation: 45, hasThirdLevel: true },
    left_arm_flexion: { optimal: 175, tolerance: 10, maxDeviation: 30, hasThirdLevel: true },
  },
  backswingtop: {
    reverse_spine: { optimal: 0, tolerance: 5, maxDeviation: 20, hasThirdLevel: false },
    right_leg_flexion: { optimal: 160, tolerance: 15, maxDeviation: 40, hasThirdLevel: false },
    head_location: { optimal: 0, tolerance: 5, maxDeviation: 20, hasThirdLevel: true },
    right_hip_rotation: { optimal: 45, tolerance: 15, maxDeviation: 45, hasThirdLevel: true },
    center_of_gravity: { optimal: 60, tolerance: 15, maxDeviation: 40, hasThirdLevel: true },
  },
  downswing: {
    center_of_gravity: { optimal: 50, tolerance: 15, maxDeviation: 40, hasThirdLevel: true },
    right_elbow_location: { optimal: 0, tolerance: 10, maxDeviation: 30, invertSign: true, hasThirdLevel: false },
    right_arm_rotation: { optimal: 15, tolerance: 10, maxDeviation: 30, hasThirdLevel: false },
  },
  impact: {
    head_location: { optimal: 0, tolerance: 5, maxDeviation: 20, hasThirdLevel: true },
    hanging_back: { optimal: 0, tolerance: 10, maxDeviation: 30, hasThirdLevel: false },
    left_arm_flexion: { optimal: 175, tolerance: 10, maxDeviation: 30, hasThirdLevel: true },
    right_arm_flexion: { optimal: 160, tolerance: 15, maxDeviation: 40, hasThirdLevel: true },
  },
  follow: {
    left_line_align: { optimal: 180, tolerance: 10, maxDeviation: 30, hasThirdLevel: true },
    chicken_wing: { optimal: 175, tolerance: 10, maxDeviation: 30, hasThirdLevel: true },
    center_of_gravity: { optimal: 80, tolerance: 15, maxDeviation: 40, hasThirdLevel: true },
  },
  finish: {
    center_of_gravity: { optimal: 90, tolerance: 10, maxDeviation: 30, hasThirdLevel: false },
    right_foot_rotation: { optimal: 90, tolerance: 15, maxDeviation: 45, hasThirdLevel: false },
    left_foot_fix: { optimal: 0, tolerance: 10, maxDeviation: 30, hasThirdLevel: false },
  },
};

@Injectable()
export class GolfSwingScoreService {
  /**
   * 단일 항목 점수 계산
   */
  calculateItemScore(
    phase: string,
    item: string,
    value: number | null | undefined,
    lang: 'ko' | 'en' = 'ko',
  ): ScoreResult | null {
    if (value === null || value === undefined) {
      return null;
    }

    const config = ITEM_CONFIGS[phase]?.[item];
    if (!config) {
      return null;
    }

    const { optimal, tolerance, maxDeviation, invertSign, hasThirdLevel } = config;

    // 편차 계산
    let deviation = value - optimal;
    if (invertSign) {
      deviation = -deviation;
    }
    const absDeviation = Math.abs(deviation);

    // 점수 계산 (0-100)
    let score: number;
    if (absDeviation <= tolerance) {
      // 허용 오차 내: 75-100점
      score = 100 - (absDeviation / tolerance) * 25;
    } else if (absDeviation <= maxDeviation) {
      // 허용 오차 초과, 최대 편차 이내: 0-75점
      const excessDeviation = absDeviation - tolerance;
      const remainingRange = maxDeviation - tolerance;
      score = 75 - (excessDeviation / remainingRange) * 75;
    } else {
      // 최대 편차 초과: 0점
      score = 0;
    }

    score = Math.max(0, Math.min(100, Math.round(score)));

    // 멘트 레벨 결정
    let mentLevel: 1 | 2 | 3;
    if (score > 75) {
      mentLevel = 1; // 좋음
    } else if (hasThirdLevel) {
      // 3레벨이 있는 경우: 편차 방향으로 결정
      mentLevel = deviation >= 0 ? 2 : 3;
    } else {
      // 3레벨이 없는 경우: 항상 2
      mentLevel = 2;
    }

    const comment = getComment(phase, item, mentLevel, lang);

    return { score, mentLevel, comment };
  }

  /**
   * 전체 REMO API 결과에서 점수 계산
   */
  calculateAllScores(remoResult: any, lang: 'ko' | 'en' = 'ko'): {
    scores: { [key: string]: ScoreResult };
    totalScore: number;
  } {
    const scores: { [key: string]: ScoreResult } = {};
    let totalScore = 0;
    let itemCount = 0;

    // Address
    const addressItems = [
      { item: 'shoulder_tilt', value: remoResult.address?.shoulder_tilt, key: 'addressShoulderTilt' },
      { item: 'stance', value: remoResult.address?.stance, key: 'addressStance' },
      { item: 'upper_body_tilt', value: remoResult.address?.upper_body_tilt, key: 'addressUpperBodyTilt' },
    ];
    for (const { item, value, key } of addressItems) {
      const result = this.calculateItemScore('address', item, value, lang);
      if (result) {
        scores[key] = result;
        totalScore += result.score;
        itemCount++;
      }
    }

    // Takeback
    const takebackItems = [
      { item: 'left_shoulder_rotation', value: remoResult.takeback?.left_shoulder_rotation, key: 'takebackLeftShoulderRotation' },
      { item: 'left_arm_flexion', value: remoResult.takeback?.left_arm_flexion, key: 'takebackLeftArmFlexion' },
      { item: 'right_arm_flexion', value: remoResult.takeback?.right_arm_flexion, key: 'takebackRightArmFlexion' },
      { item: 'right_hip_rotation', value: remoResult.takeback?.right_hip_rotation, key: 'takebackRightHipRotation' },
    ];
    for (const { item, value, key } of takebackItems) {
      const result = this.calculateItemScore('takeback', item, value, lang);
      if (result) {
        scores[key] = result;
        totalScore += result.score;
        itemCount++;
      }
    }

    // Backswing
    const backswingItems = [
      { item: 'head_location', value: remoResult.backswing?.head_location, key: 'backswingHeadLocation' },
      { item: 'left_shoulder_rotation', value: remoResult.backswing?.left_shoulder_rotation, key: 'backswingLeftShoulderRotation' },
      { item: 'left_arm_flexion', value: remoResult.backswing?.left_arm_flexion, key: 'backswingLeftArmFlexion' },
    ];
    for (const { item, value, key } of backswingItems) {
      const result = this.calculateItemScore('backswing', item, value, lang);
      if (result) {
        scores[key] = result;
        totalScore += result.score;
        itemCount++;
      }
    }

    // Backswingtop
    const backswingtopItems = [
      { item: 'reverse_spine', value: remoResult.backswingtop?.reverse_spine, key: 'backswingTopReverseSpine' },
      { item: 'right_leg_flexion', value: remoResult.backswingtop?.right_leg_flexion, key: 'backswingTopRightLegFlexion' },
      { item: 'head_location', value: remoResult.backswingtop?.head_location, key: 'backswingTopHeadLocation' },
      { item: 'right_hip_rotation', value: remoResult.backswingtop?.right_hip_rotation, key: 'backswingTopRightHipRotation' },
      { item: 'center_of_gravity', value: remoResult.backswingtop?.center_of_gravity, key: 'backswingTopCenterOfGravity' },
    ];
    for (const { item, value, key } of backswingtopItems) {
      const result = this.calculateItemScore('backswingtop', item, value, lang);
      if (result) {
        scores[key] = result;
        totalScore += result.score;
        itemCount++;
      }
    }

    // Downswing
    const downswingItems = [
      { item: 'center_of_gravity', value: remoResult.downswing?.center_of_gravity, key: 'downswingCenterOfGravity' },
      { item: 'right_elbow_location', value: remoResult.downswing?.right_elbow_location, key: 'downswingRightElbowLocation' },
      { item: 'right_arm_rotation', value: remoResult.downswing?.right_arm_rotation, key: 'downswingRightArmRotation' },
    ];
    for (const { item, value, key } of downswingItems) {
      const result = this.calculateItemScore('downswing', item, value, lang);
      if (result) {
        scores[key] = result;
        totalScore += result.score;
        itemCount++;
      }
    }

    // Impact
    const impactItems = [
      { item: 'head_location', value: remoResult.impact?.head_location, key: 'impactHeadLocation' },
      { item: 'hanging_back', value: remoResult.impact?.hanging_back, key: 'impactHangingBack' },
      { item: 'left_arm_flexion', value: remoResult.impact?.left_arm_flexion, key: 'impactLeftArmFlexion' },
      { item: 'right_arm_flexion', value: remoResult.impact?.right_arm_flexion, key: 'impactRightArmFlexion' },
    ];
    for (const { item, value, key } of impactItems) {
      const result = this.calculateItemScore('impact', item, value, lang);
      if (result) {
        scores[key] = result;
        totalScore += result.score;
        itemCount++;
      }
    }

    // Follow
    const followItems = [
      { item: 'left_line_align', value: remoResult.follow?.left_line_align, key: 'followLeftLineAlign' },
      { item: 'chicken_wing', value: remoResult.follow?.chicken_wing, key: 'followChickenWing' },
      { item: 'center_of_gravity', value: remoResult.follow?.center_of_gravity, key: 'followCenterOfGravity' },
    ];
    for (const { item, value, key } of followItems) {
      const result = this.calculateItemScore('follow', item, value, lang);
      if (result) {
        scores[key] = result;
        totalScore += result.score;
        itemCount++;
      }
    }

    // Finish
    const finishItems = [
      { item: 'center_of_gravity', value: remoResult.finish?.center_of_gravity, key: 'finishCenterOfGravity' },
      { item: 'right_foot_rotation', value: remoResult.finish?.right_foot_rotation, key: 'finishRightFootRotation' },
      { item: 'left_foot_fix', value: remoResult.finish?.left_foot_fix, key: 'finishLeftFootFix' },
    ];
    for (const { item, value, key } of finishItems) {
      const result = this.calculateItemScore('finish', item, value, lang);
      if (result) {
        scores[key] = result;
        totalScore += result.score;
        itemCount++;
      }
    }

    // 평균 총점 계산
    const avgTotalScore = itemCount > 0 ? Math.round(totalScore / itemCount) : 0;

    return { scores, totalScore: avgTotalScore };
  }

  /**
   * DB Entity에 저장할 점수 데이터 생성
   */
  createScoreEntityData(remoResult: any): Partial<any> {
    const { scores, totalScore } = this.calculateAllScores(remoResult);

    const entityData: any = {
      totalScore,
    };

    // 각 항목별 점수와 멘트 레벨 매핑
    for (const [key, result] of Object.entries(scores)) {
      entityData[`${key}Score`] = result.score;
      entityData[`${key}Ment`] = result.mentLevel;
    }

    return entityData;
  }
}
