// 사용자 데이터 관리 서비스

import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from './firebase-client';
import {
  UserProfile,
  Character,
  WeeklyChecklist,
  CharacterWeeklyState,
  createEmptyWeeklyState,
} from '@/types/user';

// 사용자 프로필 가져오기
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    return { uid, ...userSnap.data() } as UserProfile;
  }
  return null;
}

// 캐릭터 등록 (로아 API로 조회 후 저장)
export async function registerCharacter(
  uid: string,
  characterName: string
): Promise<{ success: boolean; characters?: Character[]; error?: string }> {
  try {
    // 로아 API로 캐릭터 정보 조회 (profile, siblings 포함)
    const response = await fetch(`/api/lostark?characterName=${encodeURIComponent(characterName)}`);

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: '캐릭터를 찾을 수 없습니다.' };
      }
      return { success: false, error: '캐릭터 정보를 가져오는데 실패했습니다.' };
    }

    const data = await response.json();
    const profile = data.profile;
    const siblings = data.siblings;

    if (!siblings || !Array.isArray(siblings) || siblings.length === 0) {
      return { success: false, error: '캐릭터 정보를 찾을 수 없습니다.' };
    }

    // siblings 데이터로 기본 캐릭터 목록 생성
    let characters: Character[] = siblings.map((char: any) => ({
      name: char.CharacterName || '',
      server: char.ServerName || '',
      class: char.CharacterClassName || '',
      itemLevel: parseFloat(char.ItemAvgLevel?.replace(/,/g, '') || '0'),
      combatLevel: char.CharacterLevel || 0,
      imageUrl: '', // 페이지 로드 시 별도로 가져옴
      lastUpdated: new Date().toISOString(),
    }));

    // 검색한 캐릭터의 이미지는 바로 설정 (profile에서 가져옴)
    if (profile) {
      const mainCharIndex = characters.findIndex(c => c.name === profile.CharacterName);
      if (mainCharIndex !== -1) {
        characters[mainCharIndex].imageUrl = profile.CharacterImage || '';
        characters[mainCharIndex].itemLevel = parseFloat(profile.ItemMaxLevel?.replace(/,/g, '') || characters[mainCharIndex].itemLevel.toString());
      }
    }

    // 레벨 높은 순 정렬
    characters.sort((a, b) => b.itemLevel - a.itemLevel);

    // 현재 사용자 프로필 가져오기
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);
    const currentProfile = userSnap.exists() ? userSnap.data() as UserProfile : null;

    // 주간 체크리스트 초기화 (기존 데이터 유지하면서 새 캐릭터 추가)
    const weeklyChecklist: WeeklyChecklist = currentProfile?.weeklyChecklist || {};

    characters.forEach(char => {
      if (!weeklyChecklist[char.name]) {
        weeklyChecklist[char.name] = createEmptyWeeklyState(char.itemLevel);
      }
    });

    // DB 업데이트
    await updateDoc(userRef, {
      characters,
      mainCharacter: characters[0]?.name || characterName,
      weeklyChecklist,
      lastUpdated: new Date().toISOString(),
    });

    return { success: true, characters };
  } catch (error) {
    console.error('캐릭터 등록 오류:', error);
    return { success: false, error: '캐릭터 등록에 실패했습니다.' };
  }
}

// 캐릭터 정보 갱신 (API에서 정보만 가져옴 - DB 저장 안함)
export async function refreshCharacter(
  characterName: string
): Promise<{ success: boolean; character?: Character; error?: string }> {
  try {
    const response = await fetch(`/api/lostark?characterName=${encodeURIComponent(characterName)}`);

    if (!response.ok) {
      return { success: false, error: '캐릭터 정보를 가져오는데 실패했습니다.' };
    }

    const data = await response.json();
    const profile = data.profile;

    if (!profile) {
      return { success: false, error: '캐릭터 프로필을 찾을 수 없습니다.' };
    }

    // 아이템 레벨 파싱 (ItemAvgLevel 사용)
    const itemLevelStr = profile.ItemAvgLevel || '0';
    const parsedLevel = parseFloat(itemLevelStr.replace(/,/g, ''));

    // profile에서 가져오면 이미지도 있음
    const updatedCharacter: Character = {
      name: profile.CharacterName || characterName,
      server: profile.ServerName || '',
      class: profile.CharacterClassName || '',
      itemLevel: parsedLevel,
      combatLevel: profile.CharacterLevel || 0,
      imageUrl: profile.CharacterImage || '',
      lastUpdated: new Date().toISOString(),
    };

    return { success: true, character: updatedCharacter };
  } catch (error) {
    console.error('캐릭터 갱신 오류:', error);
    return { success: false, error: '캐릭터 갱신에 실패했습니다.' };
  }
}

// 주간 체크리스트 저장
export async function saveWeeklyChecklist(
  uid: string,
  weeklyChecklist: WeeklyChecklist
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, { weeklyChecklist });
    return { success: true };
  } catch (error) {
    console.error('체크리스트 저장 오류:', error);
    return { success: false, error: '저장에 실패했습니다.' };
  }
}

// 단일 캐릭터 체크리스트 업데이트
export async function updateCharacterWeekly(
  uid: string,
  characterName: string,
  state: CharacterWeeklyState
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', uid);
    await updateDoc(userRef, {
      [`weeklyChecklist.${characterName}`]: state,
    });
    return { success: true };
  } catch (error) {
    console.error('캐릭터 체크리스트 업데이트 오류:', error);
    return { success: false, error: '저장에 실패했습니다.' };
  }
}

// 여러 캐릭터의 이미지를 순차적으로 가져와서 업데이트
export async function updateCharacterImages(
  uid: string,
  characterNames: string[]
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      return { success: false, error: '사용자를 찾을 수 없습니다.' };
    }

    const userProfile = userSnap.data() as UserProfile;
    const characters = [...(userProfile.characters || [])];
    let updated = false;

    // 순차적으로 각 캐릭터의 이미지 가져오기 (API rate limit 고려)
    for (const charName of characterNames) {
      const charIndex = characters.findIndex(c => c.name === charName);
      if (charIndex === -1 || characters[charIndex].imageUrl) continue;

      try {
        const response = await fetch(`/api/lostark?characterName=${encodeURIComponent(charName)}`);
        if (response.ok) {
          const data = await response.json();
          if (data.profile?.CharacterImage) {
            characters[charIndex].imageUrl = data.profile.CharacterImage;
            characters[charIndex].itemLevel = parseFloat(data.profile.ItemMaxLevel?.replace(/,/g, '') || characters[charIndex].itemLevel.toString());
            updated = true;
          }
        }
        // API rate limit 방지를 위한 딜레이
        await new Promise(resolve => setTimeout(resolve, 200));
      } catch (e) {
        console.error(`캐릭터 ${charName} 이미지 로드 실패:`, e);
      }
    }

    if (updated) {
      // 레벨 순 정렬
      characters.sort((a, b) => b.itemLevel - a.itemLevel);

      // 주간 체크리스트도 업데이트 (레벨 변경된 캐릭터)
      const weeklyChecklist = userProfile.weeklyChecklist || {};
      characters.forEach(char => {
        if (!weeklyChecklist[char.name]) {
          weeklyChecklist[char.name] = createEmptyWeeklyState(char.itemLevel);
        }
      });

      await updateDoc(userRef, { characters, weeklyChecklist });
    }

    return { success: true };
  } catch (error) {
    console.error('캐릭터 이미지 업데이트 오류:', error);
    return { success: false, error: '이미지 로드에 실패했습니다.' };
  }
}

// 캐릭터 삭제
export async function removeCharacter(
  uid: string,
  characterName: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userProfile = userSnap.data() as UserProfile;
      const characters = userProfile.characters.filter(c => c.name !== characterName);
      const weeklyChecklist = { ...userProfile.weeklyChecklist };
      delete weeklyChecklist[characterName];

      await updateDoc(userRef, {
        characters,
        weeklyChecklist,
        mainCharacter: characters[0]?.name || '',
      });
    }

    return { success: true };
  } catch (error) {
    console.error('캐릭터 삭제 오류:', error);
    return { success: false, error: '삭제에 실패했습니다.' };
  }
}

// 계정 탈퇴 (DB에서 사용자 데이터 삭제)
export async function deleteUserAccount(
  uid: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const userRef = doc(db, 'users', uid);
    await deleteDoc(userRef);
    return { success: true };
  } catch (error) {
    console.error('계정 삭제 오류:', error);
    return { success: false, error: '계정 삭제에 실패했습니다.' };
  }
}
