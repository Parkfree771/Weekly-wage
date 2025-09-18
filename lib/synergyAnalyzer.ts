import {
  RaidComposition,
  SynergyAnalysis,
  SwapRecommendation,
  SYNERGY_DATA,
  SYNERGY_WEIGHTS,
  CLASS_PRIORITY,
  CLASS_LIST,
  SynergyEffect,
  PartyMember
} from './synergyData';

interface SynergyCounter {
  [key: string]: {
    value: number;
    count: number;
    providers: string[];
  };
}

export class SynergyAnalyzer {
  private composition: RaidComposition;

  constructor(composition: RaidComposition) {
    this.composition = composition;
  }

  private getAllMembers() {
    return [...this.composition.party1, ...this.composition.party2]
      .filter(member => member.class !== null);
  }

  private getSynergyCounter(): SynergyCounter {
    const counter: SynergyCounter = {};
    const allMembers = this.getAllMembers();

    allMembers.forEach(member => {
      if (!member.class) return;
      
      const classData = SYNERGY_DATA[member.class];
      if (!classData) return;

      // 서포터는 시너지를 제공하지 않는다고 간주
      if (classData.isSupporter) return;

      classData.synergies.forEach(synergy => {
        const key = synergy.type;
        
        if (!counter[key]) {
          counter[key] = {
            value: 0,
            count: 0,
            providers: []
          };
        }

        if (counter[key].count === 0) {
          counter[key].value = Math.max(counter[key].value, synergy.value);
          counter[key].count++;
          counter[key].providers.push(member.class!);
        } else {
          counter[key].providers.push(member.class!);
        }
      });
    });

    return counter;
  }

  public analyzeSynergies(): SynergyAnalysis[] {
    const counter = this.getSynergyCounter();
    const analyses: SynergyAnalysis[] = [];

    const synergyThresholds = {
      '피해 증가': { max: 16, optimal: 10 },
      '방어력 감소': { max: 12, optimal: 12 },
      '치명타 적중률 증가': { max: 18, optimal: 18 },
      '치명타 피해 증가': { max: 10, optimal: 10 },
      '백/헤드 피해 증가': { max: 12, optimal: 12 },
      '공/이속 증가': { max: 13.8, optimal: 13.8 },
      '공격력 증가': { max: 100, optimal: 1 }
    };

    Object.keys(synergyThresholds).forEach(type => {
      const data = counter[type];
      const threshold = synergyThresholds[type as keyof typeof synergyThresholds];
      
      if (data) {
        const efficiency = Math.min((data.value / threshold.optimal) * 100, 100);
        let status: 'optimal' | 'excessive' | 'insufficient';
        
        if (data.value > threshold.max) {
          status = 'excessive';
        } else if (data.value >= threshold.optimal) {
          status = 'optimal';
        } else {
          status = 'insufficient';
        }

        analyses.push({
          type,
          currentValue: data.value,
          maxEffectiveValue: threshold.max,
          efficiency,
          status,
          providedBy: data.providers
        });
      } else {
        analyses.push({
          type,
          currentValue: 0,
          maxEffectiveValue: threshold.max,
          efficiency: 0,
          status: 'insufficient',
          providedBy: []
        });
      }
    });

    return analyses.sort((a, b) => b.efficiency - a.efficiency);
  }

  public getOverallEfficiency(): number {
    const analyses = this.analyzeSynergies();
    const weightedSum = analyses.reduce((sum, analysis) => {
      const weight = SYNERGY_WEIGHTS[analysis.type as keyof typeof SYNERGY_WEIGHTS] || 0.5;
      return sum + (analysis.efficiency * weight);
    }, 0);
    
    const totalWeight = analyses.reduce((sum, analysis) => {
      return sum + (SYNERGY_WEIGHTS[analysis.type as keyof typeof SYNERGY_WEIGHTS] || 0.5);
    }, 0);

    // 클래스 메타 우선순위도 고려
    const allMembers = this.getAllMembers();
    const classPriorityBonus = allMembers.reduce((sum, member) => {
      if (!member.class) return sum;
      const priority = CLASS_PRIORITY[member.class as keyof typeof CLASS_PRIORITY] || 50;
      return sum + (priority - 50) * 0.1; // 우선순위를 효율에 반영
    }, 0);

    const baseEfficiency = Math.round(weightedSum / totalWeight);
    const finalEfficiency = Math.min(100, Math.max(0, baseEfficiency + classPriorityBonus));
    
    return Math.round(finalEfficiency);
  }

  private simulateSwap(party1Pos: number, party2Pos: number): SynergyAnalyzer {
    const newComposition: RaidComposition = {
      party1: [...this.composition.party1],
      party2: [...this.composition.party2]
    };

    const temp = newComposition.party1[party1Pos].class;
    newComposition.party1[party1Pos].class = newComposition.party2[party2Pos].class;
    newComposition.party2[party2Pos].class = temp;

    return new SynergyAnalyzer(newComposition);
  }

  public getSwapRecommendations(): SwapRecommendation[] {
    const currentEfficiency = this.getOverallEfficiency();
    const recommendations: SwapRecommendation[] = [];

    for (let p1 = 0; p1 < 4; p1++) {
      for (let p2 = 0; p2 < 4; p2++) {
        const member1 = this.composition.party1[p1];
        const member2 = this.composition.party2[p2];
        
        if (!member1.class || !member2.class) continue;
        if (member1.class === member2.class) continue;

        const swappedAnalyzer = this.simulateSwap(p1, p2);
        const swappedEfficiency = swappedAnalyzer.getOverallEfficiency();
        const efficiencyGain = swappedEfficiency - currentEfficiency;

        if (efficiencyGain > 1) {
          const swappedAnalysis = swappedAnalyzer.analyzeSynergies();
          const improvedSynergies = swappedAnalysis
            .filter(analysis => analysis.efficiency > 80)
            .map(analysis => analysis.type);
          
          // 메타 우선순위 기반 추천 이유 생성
          const member1Priority = CLASS_PRIORITY[member1.class as keyof typeof CLASS_PRIORITY] || 50;
          const member2Priority = CLASS_PRIORITY[member2.class as keyof typeof CLASS_PRIORITY] || 50;
          
          let reason = '';
          if (improvedSynergies.length > 0) {
            reason = `${improvedSynergies.join(', ')} 시너지 개선`;
          } else if (member1Priority > 80 || member2Priority > 80) {
            reason = '핵심 클래스 배치 최적화';
          } else {
            reason = '전체적인 시너지 밸런스 개선';
          }
          
          recommendations.push({
            party1Position: p1 + 1,
            party2Position: p2 + 1,
            party1Class: member1.class,
            party2Class: member2.class,
            efficiencyGain,
            reason
          });
        }
      }
    }

    return recommendations
      .sort((a, b) => b.efficiencyGain - a.efficiencyGain)
      .slice(0, 5);
  }

  public getSynergyStats() {
    const analyses = this.analyzeSynergies();
    const stats = {
      optimal: analyses.filter(a => a.status === 'optimal').length,
      excessive: analyses.filter(a => a.status === 'excessive').length,
      insufficient: analyses.filter(a => a.status === 'insufficient').length,
      total: analyses.length
    };

    return {
      ...stats,
      overallEfficiency: this.getOverallEfficiency(),
      analyses
    };
  }

  public getMissingSynergies(): string[] {
    const analyses = this.analyzeSynergies();
    return analyses
      .filter(analysis => analysis.currentValue === 0)
      .map(analysis => analysis.type)
      .sort();
  }

  public getExcessiveSynergies(): { type: string; excessValue: number }[] {
    const analyses = this.analyzeSynergies();
    return analyses
      .filter(analysis => analysis.status === 'excessive')
      .map(analysis => ({
        type: analysis.type,
        excessValue: analysis.currentValue - analysis.maxEffectiveValue
      }))
      .sort((a, b) => b.excessValue - a.excessValue);
  }

  // 파티별 시너지 분석
  public getPartyAnalysis(partyNumber: 1 | 2): {
    members: PartyMember[];
    emptySlots: PartyMember[];
    currentSynergies: { [key: string]: { value: number; providers: string[]; rawValues: { provider: string; value: number }[] } };
    memberCount: number;
    emptySlotCount: number;
    hasSupporter: boolean;
  } {
    const party = partyNumber === 1 ? this.composition.party1 : this.composition.party2;
    const members = party.filter(member => member.class !== null);
    const emptySlots = party.filter(member => member.class === null);

    const partyCounter: { [key: string]: { value: number; providers: string[]; rawValues: { provider: string; value: number }[] } } = {};

    members.forEach(member => {
      if (!member.class) return;
      const classData = SYNERGY_DATA[member.class];
      if (!classData || classData.isSupporter) return;

      classData.synergies.forEach(synergy => {
        if (!partyCounter[synergy.type]) {
          partyCounter[synergy.type] = { value: 0, providers: [], rawValues: [] };
        }
        partyCounter[synergy.type].rawValues.push({ provider: member.class!, value: synergy.value });
      });
    });

    // 새로운 규칙에 따라 최종 값 계산
    Object.keys(partyCounter).forEach(synergyType => {
      const synergyData = partyCounter[synergyType];

      // 같은 클래스의 중복 시너지 제거
      const uniqueRawValues: { provider: string; value: number }[] = [];
      const seenProviders = new Set<string>();
      synergyData.rawValues.forEach(item => {
        if (!seenProviders.has(item.provider)) {
          uniqueRawValues.push(item);
          seenProviders.add(item.provider);
        }
      });
      synergyData.rawValues = uniqueRawValues;
      // 방어력 감소는 클래스 이름으로 정렬하여 일관된 순서 보장
      if (synergyType === '방어력 감소') {
        synergyData.rawValues.sort((a, b) => a.provider.localeCompare(b.provider));
      } else {
        synergyData.rawValues.sort((a, b) => b.value - a.value);
      }

      const providers: string[] = synergyData.rawValues.map(item => item.provider);
      const calculatedValues: { provider: string; value: number; efficiency: number }[] = [];
      let currentSum = 0;

      if (synergyType === '방어력 감소') {
        // 방어력 감소는 단순히 고정 값으로 처리
        // 1방깃: 6.38%, 2방깎: 7.22% 추가, 3방깎: 8.3% 추가
        synergyData.rawValues.forEach((item, index) => {
          let efficiency = 0;

          if (index === 0) {
            efficiency = 6.38; // 첫 번째 방깎
          } else if (index === 1) {
            efficiency = 7.22; // 두 번째 방깎
          } else if (index === 2) {
            efficiency = 8.3; // 세 번째 방깎
          } else {
            efficiency = 2.0; // 그 이후
          }

          calculatedValues.push({ provider: item.provider, value: item.value, efficiency: efficiency });
        });
      } else {
        // 피해 증가 등 + 요인 시너지: 덧셈 방식으로 효율이 감소
        synergyData.rawValues.forEach(item => {
          const vNew = item.value;
          const efficiency = (((100 + currentSum + vNew) / (100 + currentSum)) - 1) * 100;
          calculatedValues.push({ provider: item.provider, value: item.value, efficiency: efficiency });
          currentSum += item.value;
        });
      }

      const totalValue = calculatedValues.reduce((sum, cv) => sum + cv.efficiency, 0);

      synergyData.value = Math.round(totalValue * 100) / 100;
      synergyData.providers = providers;
      // @ts-ignore
      synergyData.calculatedValues = calculatedValues.map(cv => ({ ...cv, efficiency: Math.round(cv.efficiency * 100) / 100 }));
    });

    return {
      members,
      emptySlots,
      currentSynergies: partyCounter,
      memberCount: members.length,
      emptySlotCount: emptySlots.filter(slot => slot.position !== 4).length, // 서포터 슬롯 제외
      hasSupporter: party[3].class !== null
    };
  }

  // 빈 슬롯을 위한 추천 시너지
  public getRecommendedSynergiesForEmptySlot(partyNumber: 1 | 2): {
    synergyType: string;
    providingClasses: string[];
  }[] {
    const partyAnalysis = this.getPartyAnalysis(partyNumber);
    const otherPartyAnalysis = this.getPartyAnalysis(partyNumber === 1 ? 2 : 1);
    
    if (partyAnalysis.emptySlotCount === 0) return [];

    const allCurrentSynergies = { ...partyAnalysis.currentSynergies };
    
    // 다른 파티의 시너지도 고려 (중복 방지)
    Object.keys(otherPartyAnalysis.currentSynergies).forEach(synergyType => {
      if (allCurrentSynergies[synergyType]) {
        allCurrentSynergies[synergyType].value = Math.max(
          allCurrentSynergies[synergyType].value,
          otherPartyAnalysis.currentSynergies[synergyType].value
        );
      } else {
        allCurrentSynergies[synergyType] = otherPartyAnalysis.currentSynergies[synergyType];
      }
    });

    // 필요한 시너지 우선순위
    const synergyPriority = [
      '방어력 감소',
      '치명타 적중률 증가', 
      '백/헤드 피해 증가',
      '피해 증가',
      '치명타 피해 증가',
      '공/이속 증가'
    ];

    const recommendations = [];
    
    for (const synergyType of synergyPriority) {
      if (!allCurrentSynergies[synergyType]) {
        // 해당 시너지를 제공하는 클래스 찾기
        const providingClasses = CLASS_LIST.filter(className => {
          const classData = SYNERGY_DATA[className];
          return !classData.isSupporter && 
                 classData.synergies.some(s => s.type === synergyType);
        });

        if (providingClasses.length > 0) {
          recommendations.push({
            synergyType: synergyType,
            providingClasses: providingClasses.slice(0, 5) // 상위 5개만
          });
        }
      }
    }

    return recommendations.slice(0, 3); // 상위 3개 추천
  }


  // 클래스별 시너지 정보 가져오기
  public static getClassesBySynergy(synergyType: string): string[] {
    return CLASS_LIST.filter(className => {
      const classData = SYNERGY_DATA[className];
      return !classData.isSupporter && 
             classData.synergies.some(s => s.type === synergyType);
    });
  }
}