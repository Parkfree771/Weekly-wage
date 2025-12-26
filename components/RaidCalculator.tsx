'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Form, Badge, Accordion, Row, Col, Button, Collapse } from 'react-bootstrap';
import Image from 'next/image';
import { raids } from '@/data/raids';
import { calculateRanking } from '@/utils/goldRanking';

type Character = {
  characterName: string;
  itemLevel: number;
};

type RaidCalculatorProps = {
  selectedCharacters: Character[];
};

type GateSelection = {
  [key: string]: {
    [key: string]: {
      [key: string]: 'none' | 'withMore' | 'withoutMore';
    };
  };
};


export default function RaidCalculator({ selectedCharacters }: RaidCalculatorProps) {
  const [gateSelection, setGateSelection] = useState<GateSelection>({});
  const [showAllRaids, setShowAllRaids] = useState<{ [key: string]: boolean }>({});
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);
  const [coreFarmingMoreEnabled, setCoreFarmingMoreEnabled] = useState<{ [key: string]: boolean }>({}); // 캐릭터별 코어 파밍 더보기 ON/OFF

  // 레이드 그룹명과 이미지 파일명 매핑
  const raidImages: { [key: string]: string } = {
    '종막': '/abrelshud.png',
    '4막': '/illiakan.png',
    '3막': '/ivory-tower.png',
    '2막': '/kazeros.png',
    '1막': '/aegir.png',
    '서막': '/echidna.png',
    '베히모스': '/behemoth.png'
  };

  // 모바일 감지
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // groupRaids를 useMemo로 메모이제이션 (raids는 변경되지 않으므로 한 번만 계산)
  const groupedRaids = useMemo(() => {
    const grouped: { [key: string]: any[] } = {};
    raids.forEach(raid => {
      const groupName = raid.name.split(' ')[0];
      if (!grouped[groupName]) {
        grouped[groupName] = [];
      }
      grouped[groupName].push(raid);
    });
    return grouped;
  }, []); // raids는 static이므로 빈 의존성 배열

  useEffect(() => {
    const initialSelection: GateSelection = {};
    selectedCharacters.forEach(character => {
      initialSelection[character.characterName] = {};
      const characterRaids = raids
        .filter(raid => character.itemLevel >= raid.level)
        .sort((a, b) => b.level - a.level);

      const selectedGroups: string[] = [];

      raids.forEach(raid => {
        initialSelection[character.characterName][raid.name] = {};
        raid.gates.forEach(gate => {
          initialSelection[character.characterName][raid.name][gate.gate] = 'none';
        });
      });

      for (const raid of characterRaids) {
        const groupName = raid.name.split(' ')[0];

        // 같은 그룹에서 이미 선택된 경우 건너뛰기
        if (selectedGroups.includes(groupName)) {
          continue;
        }

        // 종막 또는 4막인 경우 더보기o (골드 적게)로 체크
        if (groupName === '종막' || groupName === '4막') {
          selectedGroups.push(groupName);
          for (const gate of raid.gates) {
            initialSelection[character.characterName][raid.name][gate.gate] = 'withoutMore';
          }
        } else if (groupName === '3막') {
          // 3막은 클리어 골드(더보기 없이)로 체크
          selectedGroups.push(groupName);
          for (const gate of raid.gates) {
            initialSelection[character.characterName][raid.name][gate.gate] = 'withMore';
          }
        } else {
          // 기존 로직: 최대 3개 그룹까지
          if (selectedGroups.length < 3) {
            selectedGroups.push(groupName);
            for (const gate of raid.gates) {
              initialSelection[character.characterName][raid.name][gate.gate] = 'withMore';
            }
          }
        }
      }
    });
    setGateSelection(initialSelection);

    // 캐릭터별 코어 파밍 더보기 초기화 (기본 ON)
    const initialCoreFarming: { [key: string]: boolean } = {};
    selectedCharacters.forEach(character => {
      initialCoreFarming[character.characterName] = true;
    });
    setCoreFarmingMoreEnabled(initialCoreFarming);
  }, [selectedCharacters]);

  const getHeaderCheckState = (characterName: string, raidName: string, selection: 'withMore' | 'withoutMore') => {
    const raid = raids.find(r => r.name === raidName);
    if (!raid || !gateSelection[characterName]?.[raidName]) return false;

    return raid.gates.every(gate =>
      gateSelection[characterName][raidName][gate.gate] === selection
    );
  };

  // 해당 레이드에 선택된 관문이 있는지 확인
  const hasAnyGateSelected = (characterName: string, raidName: string) => {
    const raid = raids.find(r => r.name === raidName);
    if (!raid || !gateSelection[characterName]?.[raidName]) return false;

    return raid.gates.some(gate =>
      gateSelection[characterName][raidName][gate.gate] !== 'none'
    );
  };

  const handleHeaderChange = (characterName: string, raidName: string, selection: 'withMore' | 'withoutMore') => {
    setGateSelection(prev => {
      const newGateSelection = JSON.parse(JSON.stringify(prev));
      const raid = raids.find(r => r.name === raidName)!;
      const allSelected = raid.gates.every(gate => 
        newGateSelection[characterName]?.[raidName]?.[gate.gate] === selection
      );

      const newSelection = allSelected ? 'none' : selection;

      // Only change gates in this specific raid, not the entire group
      for (const gate of raid.gates) {
        // If selecting a gate, deselect the same gate number in other difficulties of the same group
        if (newSelection !== 'none') {
          const groupName = raidName.split(' ')[0];
          for (const r of groupedRaids[groupName]) {
            if (r.name !== raidName) {
              const sameGate = r.gates.find(g => g.gate === gate.gate);
              if (sameGate && newGateSelection[characterName]?.[r.name]) {
                newGateSelection[characterName][r.name][gate.gate] = 'none';
              }
            }
          }
        }
        newGateSelection[characterName][raidName][gate.gate] = newSelection;
      }

      return newGateSelection;
    });
  };

  const handleGateChange = (characterName: string, raidName: string, gate: number, selection: 'none' | 'withMore' | 'withoutMore') => {
    setGateSelection(prev => {
      const currentSelection = prev[characterName]?.[raidName]?.[gate];
      let newSelection = currentSelection === selection ? 'none' : selection;

      const newGateSelection = JSON.parse(JSON.stringify(prev));

      // Only prevent selecting the same gate with different difficulties in the same group
      if (newSelection !== 'none') {
        const groupName = raidName.split(' ')[0];
        for (const r of groupedRaids[groupName]) {
          if (r.name !== raidName) {
            // Only deselect the same gate number, not all gates
            const sameGate = r.gates.find(g => g.gate === gate);
            if (sameGate && newGateSelection[characterName]?.[r.name]) {
              newGateSelection[characterName][r.name][gate] = 'none';
            }
          }
        }
      }

      newGateSelection[characterName][raidName][gate] = newSelection;

      return newGateSelection;
    });
  };

  const calculateRaidGroupGold = (characterName: string, groupName: string) => {
    let totalGold = 0;
    if (gateSelection[characterName]) {
      for (const raidName in gateSelection[characterName]) {
        if (raidName.startsWith(groupName)) {
          for (const gate in gateSelection[characterName][raidName]) {
            const selection = gateSelection[characterName][raidName][gate];
            if (selection !== 'none') {
              const raid = raids.find(r => r.name === raidName);
              if (raid) {
                const gateInfo = raid.gates.find(g => g.gate === parseInt(gate));
                if (gateInfo) {
                  if (selection === 'withMore') {
                    totalGold += gateInfo.gold;
                  } else if (selection === 'withoutMore') {
                    totalGold += gateInfo.gold - gateInfo.moreGold;
                  }
                }
              }
            }
          }
        }
      }
    }
    return totalGold;
  };

  const calculateCharacterGold = (characterName: string) => {
    let totalGold = 0;
    if (gateSelection[characterName]) {
      for (const groupName in groupedRaids) {
        totalGold += calculateRaidGroupGold(characterName, groupName);
      }
    }
    return totalGold;
  };

  const calculateTotalGold = () => {
    let totalGold = 0;
    for (const characterName in gateSelection) {
      totalGold += calculateCharacterGold(characterName);
    }
    return totalGold;
  };

  const hasMoreSelected = (characterName: string, groupName: string) => {
    if (!gateSelection[characterName]) return false;

    for (const raidName in gateSelection[characterName]) {
      if (raidName.startsWith(groupName)) {
        for (const gate in gateSelection[characterName][raidName]) {
          if (gateSelection[characterName][raidName][gate] === 'withoutMore') {
            return true;
          }
        }
      }
    }
    return false;
  };

  // 전체 선택에서 더보기를 하나라도 사용했는지 확인
  const hasAnyMoreReward = () => {
    for (const characterName in gateSelection) {
      for (const raidName in gateSelection[characterName]) {
        for (const gate in gateSelection[characterName][raidName]) {
          if (gateSelection[characterName][raidName][gate] === 'withoutMore') {
            return true;
          }
        }
      }
    }
    return false;
  };

  // 캐릭터별 코어 파밍 더보기 토글 (종막/4막 일괄 변경)
  const toggleCoreFarmingMore = (characterName: string) => {
    const newEnabled = !coreFarmingMoreEnabled[characterName];

    setCoreFarmingMoreEnabled(prev => ({
      ...prev,
      [characterName]: newEnabled
    }));

    setGateSelection(prev => {
      const newGateSelection = JSON.parse(JSON.stringify(prev));

      // 해당 캐릭터의 종막과 4막 관문을 변경
      for (const raidName in newGateSelection[characterName]) {
        // 종막 또는 4막인 경우
        if (raidName.startsWith('종막') || raidName.startsWith('4막')) {
          for (const gate in newGateSelection[characterName][raidName]) {
            const currentSelection = newGateSelection[characterName][raidName][gate];

            // none이 아닌 경우만 변경
            if (currentSelection !== 'none') {
              if (newEnabled) {
                // ON: withMore → withoutMore (더보기 체크)
                newGateSelection[characterName][raidName][gate] = 'withoutMore';
              } else {
                // OFF: withoutMore → withMore (더보기 해제)
                newGateSelection[characterName][raidName][gate] = 'withMore';
              }
            }
          }
        }
      }

      return newGateSelection;
    });
  };

  // 체크된 레이드 그룹만 필터링 (모바일용)
  const getCheckedRaidGroups = (characterName: string) => {
    const checkedGroups: string[] = [];
    if (!gateSelection[characterName]) return checkedGroups;

    for (const groupName in groupedRaids) {
      let hasChecked = false;
      for (const raid of groupedRaids[groupName]) {
        if (gateSelection[characterName]?.[raid.name]) {
          for (const gate of raid.gates) {
            if (gateSelection[characterName][raid.name][gate.gate] !== 'none') {
              hasChecked = true;
              break;
            }
          }
        }
        if (hasChecked) break;
      }
      if (hasChecked) {
        checkedGroups.push(groupName);
      }
    }
    return checkedGroups;
  };

  if (selectedCharacters.length === 0) {
    return (
      <div className="text-center p-5">
      </div>
    );
  }

  return (
    <>
      <Row className="align-items-stretch">
        {selectedCharacters.map(character => {
          const checkedGroups = getCheckedRaidGroups(character.characterName);
          const uncheckedGroups = Object.keys(groupedRaids).filter(g => !checkedGroups.includes(g));
          const showAll = showAllRaids[character.characterName] || false;

          return (
            <Col lg={4} md={4} key={character.characterName} className="mb-3 mb-md-4">
              <Card className="character-raid-card" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', height: '100%' }}>
                <Card.Header
                  className="character-raid-header"
                  style={{
                    backgroundColor: 'var(--card-header-bg)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: isMobile ? '0.5rem 0.75rem' : '0.9rem 1.2rem'
                  }}
                >
                  <div className="d-flex align-items-center justify-content-between" style={{ gap: isMobile ? '0.3rem' : '0.5rem', flexWrap: 'nowrap' }}>
                    {/* 왼쪽: 캐릭터명 + 레벨 */}
                    <div className="d-flex align-items-center gap-1" style={{ minWidth: 0, flex: '1 1 auto', overflow: 'hidden' }}>
                      <span style={{
                        fontSize: isMobile ? '1rem' : '1.3rem',
                        fontWeight: 600,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {character.characterName}
                      </span>
                      <Badge
                        style={{
                          fontSize: isMobile ? '0.75rem' : '0.95rem',
                          padding: '0.25em 0.5em',
                          backgroundColor: '#6c757d',
                          color: '#ffffff',
                          fontWeight: 500,
                          flexShrink: 0,
                          whiteSpace: 'nowrap'
                        }}
                      >
                        Lv.{character.itemLevel}
                      </Badge>
                    </div>

                    {/* 오른쪽: 코어 파밍 버튼 + 골드 */}
                    <div className="d-flex align-items-center" style={{ gap: isMobile ? '0.3rem' : '0.5rem', flexShrink: 0 }}>
                      {/* 코어 파밍 더보기 토글 버튼 (1700 레벨 이상만) */}
                      {character.itemLevel >= 1700 && (
                        <Button
                          variant={coreFarmingMoreEnabled[character.characterName] ? "primary" : "secondary"}
                          size="sm"
                          onClick={() => toggleCoreFarmingMore(character.characterName)}
                          className="shadow-sm"
                          style={{
                            fontSize: isMobile ? '0.55rem' : '0.68rem',
                            padding: isMobile ? '0.2rem 0.4rem' : '0.35rem 0.65rem',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            borderRadius: '6px',
                            lineHeight: 1.2,
                            border: coreFarmingMoreEnabled[character.characterName] ? '2px solid #0d6efd' : '2px solid #6c757d',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            boxShadow: coreFarmingMoreEnabled[character.characterName]
                              ? '0 2px 6px rgba(13, 110, 253, 0.4)'
                              : '0 1px 3px rgba(0, 0, 0, 0.2)'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = coreFarmingMoreEnabled[character.characterName]
                              ? '0 4px 10px rgba(13, 110, 253, 0.5)'
                              : '0 3px 6px rgba(0, 0, 0, 0.3)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = coreFarmingMoreEnabled[character.characterName]
                              ? '0 2px 6px rgba(13, 110, 253, 0.4)'
                              : '0 1px 3px rgba(0, 0, 0, 0.2)';
                          }}
                        >
                          {coreFarmingMoreEnabled[character.characterName] ? '✓ ' : ''}코어파밍 {coreFarmingMoreEnabled[character.characterName] ? 'ON' : 'OFF'}
                        </Button>
                      )}

                      {/* 골드 */}
                      <div className="d-flex align-items-center" style={{
                        gap: isMobile ? '0.15rem' : '0.3rem',
                        backgroundColor: '#fef3c7',
                        padding: isMobile ? '0.25em 0.4em' : '0.35em 0.6em',
                        borderRadius: '6px',
                        border: '1px solid #fbbf24',
                        whiteSpace: 'nowrap'
                      }}>
                        <Image src="/gold.jpg" alt="골드" width={isMobile ? 16 : 22} height={isMobile ? 16 : 22} style={{ borderRadius: '3px' }} />
                        <span style={{
                          fontSize: isMobile ? '0.8rem' : '1.05rem',
                          fontWeight: 700,
                          color: '#92400e'
                        }}>
                          {calculateCharacterGold(character.characterName).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </Card.Header>
                <Card.Body style={{ padding: isMobile ? '0.3rem' : '0.75rem 0.75rem 0.5rem' }}>
                  <Accordion flush className="theme-accordion">
                    {/* 체크된 레이드 그룹들 */}
                    {checkedGroups.map(groupName => (
                      <Accordion.Item eventKey={groupName} key={groupName} className="raid-group-accordion">
                        <Accordion.Header style={{ fontSize: isMobile ? '1.25rem' : '1.7rem', padding: isMobile ? '0.35rem' : '0.5rem' }}>
                          <div className="d-flex align-items-center w-100">
                            {raidImages[groupName] && (
                              <Image
                                src={raidImages[groupName]}
                                alt={groupName}
                                width={100}
                                height={100}
                                quality={100}
                                style={{
                                  marginLeft: isMobile ? '-1rem' : '-1.25rem',
                                  marginRight: '0.5rem',
                                  borderRadius: '4px',
                                  width: isMobile ? '42px' : '62px',
                                  height: isMobile ? '42px' : '62px',
                                  objectFit: 'cover',
                                  flexShrink: 0
                                }}
                              />
                            )}
                            <span
                              className="me-2"
                              style={{
                                fontSize: isMobile ? '1.05rem' : '1.15rem',
                                fontWeight: 700,
                                color: 'var(--text-primary)'
                              }}
                            >
                              {groupName}
                            </span>
                            <Badge bg="success" className="ms-1" style={{ fontSize: isMobile ? '0.7rem' : '0.9rem' }}>
                              {calculateRaidGroupGold(character.characterName, groupName).toLocaleString()} G
                            </Badge>
                            {hasMoreSelected(character.characterName, groupName) && (
                              <Badge bg="danger" className="ms-1" style={{ fontSize: isMobile ? '0.65rem' : '0.85rem' }}>더보기</Badge>
                            )}
                          </div>
                        </Accordion.Header>
                        <Accordion.Body style={{ padding: isMobile ? '0.5rem' : '1.2rem' }}>
                          <Accordion flush>
                            {groupedRaids[groupName].map(raid => {
                              const isSelected = hasAnyGateSelected(character.characterName, raid.name);
                              return (
                              <Accordion.Item eventKey={raid.name} key={raid.name} className="raid-difficulty-accordion">
                                <Accordion.Header style={{ fontSize: isMobile ? '0.95rem' : '1.15rem', padding: isMobile ? '0.4rem' : '0.6rem' }}>
                                  <span style={{ fontWeight: isSelected ? 600 : 400 }}>{raid.name}</span>
                                  <Badge bg="secondary" className="ms-1" style={{ fontSize: isMobile ? '0.65rem' : '0.8rem' }}>
                                    {raid.level}
                                  </Badge>
                                  {isSelected && (
                                    <Badge bg="success" className="ms-1" style={{ fontSize: isMobile ? '0.65rem' : '0.8rem' }}>✓</Badge>
                                  )}
                                </Accordion.Header>
                                <Accordion.Body style={{ padding: isMobile ? '0.25rem' : '0.9rem' }}>
                                  <Table striped bordered hover responsive className="raid-table mb-0" style={{ fontSize: isMobile ? '0.8rem' : '1.05rem', tableLayout: 'fixed' }}>
                                    <thead>
                                      <tr>
                                        <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '18%' : '20%', whiteSpace: 'nowrap' }}>관문</th>
                                        <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '41%' : '40%' }}>
                                          <Form.Check
                                            type="checkbox"
                                            label={<span style={{ fontSize: isMobile ? '0.75rem' : '1rem', whiteSpace: 'nowrap' }}>클골</span>}
                                            checked={getHeaderCheckState(character.characterName, raid.name, 'withMore')}
                                            onChange={() => handleHeaderChange(character.characterName, raid.name, 'withMore')}
                                            style={{ marginBottom: 0 }}
                                          />
                                        </th>
                                        <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '41%' : '40%' }}>
                                          <Form.Check
                                            type="checkbox"
                                            label={<span style={{ fontSize: isMobile ? '0.75rem' : '1rem', whiteSpace: 'nowrap' }}>더보기</span>}
                                            checked={getHeaderCheckState(character.characterName, raid.name, 'withoutMore')}
                                            onChange={() => handleHeaderChange(character.characterName, raid.name, 'withoutMore')}
                                            style={{ marginBottom: 0 }}
                                          />
                                        </th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {raid.gates.map((gate: any) => (
                                        <tr key={`${raid.name}-${gate.gate}`}>
                                          <td style={{ padding: isMobile ? '0.15rem 0.2rem' : '0.5rem 0.6rem', whiteSpace: 'nowrap' }}>{gate.gate}관</td>
                                          <td
                                            onClick={() => handleGateChange(character.characterName, raid.name, gate.gate, 'withMore')}
                                            style={{ padding: isMobile ? '0.15rem 0.2rem' : '0.5rem 0.6rem', cursor: 'pointer' }}
                                          >
                                            <Form.Check
                                              type="radio"
                                              name={`${character.characterName}-${raid.name}-${gate.gate}`}
                                              id={`${character.characterName}-${raid.name}-${gate.gate}-with-more`}
                                              label={<span style={{ fontSize: isMobile ? '0.75rem' : '1rem', whiteSpace: 'nowrap' }}>{gate.gold.toLocaleString()}</span>}
                                              checked={gateSelection[character.characterName]?.[raid.name]?.[gate.gate] === 'withMore'}
                                              onChange={() => {}}
                                              style={{ marginBottom: 0 }}
                                            />
                                          </td>
                                          <td
                                            onClick={() => handleGateChange(character.characterName, raid.name, gate.gate, 'withoutMore')}
                                            style={{ padding: isMobile ? '0.15rem 0.2rem' : '0.5rem 0.6rem', cursor: 'pointer' }}
                                          >
                                            <Form.Check
                                              type="radio"
                                              name={`${character.characterName}-${raid.name}-${gate.gate}`}
                                              id={`${character.characterName}-${raid.name}-${gate.gate}-without-more`}
                                              label={<span style={{ fontSize: isMobile ? '0.75rem' : '1rem', whiteSpace: 'nowrap' }}>{(gate.gold - gate.moreGold).toLocaleString()}</span>}
                                              checked={gateSelection[character.characterName]?.[raid.name]?.[gate.gate] === 'withoutMore'}
                                              onChange={() => {}}
                                              style={{ marginBottom: 0 }}
                                            />
                                          </td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </Table>
                                </Accordion.Body>
                              </Accordion.Item>
                              );
                            })}
                          </Accordion>
                        </Accordion.Body>
                      </Accordion.Item>
                    ))}

                    {/* 체크되지 않은 레이드 그룹들 (접기/펼치기) */}
                    {uncheckedGroups.length > 0 && (
                      <>
                        <div className="text-center mt-4 mb-2">
                          <Button
                            variant="link"
                            onClick={() => setShowAllRaids(prev => ({
                              ...prev,
                              [character.characterName]: !prev[character.characterName]
                            }))}
                            style={{
                              fontSize: isMobile ? '0.7rem' : '0.85rem',
                              padding: isMobile ? '0.4rem 0.8rem' : '0.5rem 1rem',
                              color: 'var(--text-primary)',
                              textDecoration: 'none',
                              fontWeight: '600',
                              backgroundColor: showAll ? 'var(--card-header-bg)' : 'transparent',
                              border: '1px solid var(--border-color)',
                              borderRadius: '8px',
                              transition: 'all 0.2s ease',
                              boxShadow: showAll ? 'var(--shadow-sm)' : 'none',
                              width: '100%'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--card-header-bg)';
                              e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = showAll ? 'var(--card-header-bg)' : 'transparent';
                              e.currentTarget.style.boxShadow = showAll ? 'var(--shadow-sm)' : 'none';
                            }}
                          >
                            {showAll ? (
                              <>
                                다른 레이드 접기
                              </>
                            ) : (
                              <>
                                다른 레이드 보기
                                <span style={{ marginLeft: '0.4rem', color: 'var(--text-muted)', fontSize: '0.9em' }}>
                                  ({uncheckedGroups.length}개)
                                </span>
                              </>
                            )}
                          </Button>
                        </div>
                        <Collapse in={showAll}>
                          <div>
                            {uncheckedGroups.map(groupName => (
                              <Accordion.Item eventKey={groupName} key={groupName} className="raid-group-accordion">
                                <Accordion.Header style={{ fontSize: isMobile ? '1.05rem' : '1.3rem', padding: isMobile ? '0.35rem' : '0.5rem' }}>
                                  <div className="d-flex align-items-center w-100">
                                    {raidImages[groupName] && (
                                      <Image
                                        src={raidImages[groupName]}
                                        alt={groupName}
                                        width={100}
                                        height={100}
                                        quality={100}
                                        style={{
                                          marginLeft: isMobile ? '-1rem' : '-1.25rem',
                                          marginRight: '0.5rem',
                                          borderRadius: '4px',
                                          opacity: 0.7,
                                          width: isMobile ? '42px' : '52px',
                                          height: isMobile ? '42px' : '52px',
                                          objectFit: 'cover',
                                          flexShrink: 0
                                        }}
                                      />
                                    )}
                                    <span style={{ fontWeight: 600, opacity: 0.7 }}>{groupName}</span>
                                    <Badge bg="secondary" className="ms-1" style={{ fontSize: isMobile ? '0.7rem' : '0.9rem' }}>
                                      0 G
                                    </Badge>
                                  </div>
                                </Accordion.Header>
                                <Accordion.Body style={{ padding: isMobile ? '0.5rem' : '1.2rem' }}>
                                  <Accordion flush>
                                    {groupedRaids[groupName].map(raid => {
                                      const isSelected = hasAnyGateSelected(character.characterName, raid.name);
                                      return (
                                      <Accordion.Item eventKey={raid.name} key={raid.name} className="raid-difficulty-accordion">
                                        <Accordion.Header style={{ fontSize: isMobile ? '0.95rem' : '1.15rem', padding: isMobile ? '0.4rem' : '0.6rem' }}>
                                          <span style={{ fontWeight: isSelected ? 600 : 400 }}>{raid.name}</span>
                                          <Badge bg="secondary" className="ms-1" style={{ fontSize: isMobile ? '0.65rem' : '0.8rem' }}>
                                            {raid.level}
                                          </Badge>
                                          {isSelected && (
                                            <Badge bg="success" className="ms-1" style={{ fontSize: isMobile ? '0.65rem' : '0.8rem' }}>✓</Badge>
                                          )}
                                        </Accordion.Header>
                                        <Accordion.Body style={{ padding: isMobile ? '0.25rem' : '0.9rem' }}>
                                          <Table striped bordered hover responsive className="raid-table mb-0" style={{ fontSize: isMobile ? '0.8rem' : '1.05rem', tableLayout: 'fixed' }}>
                                            <thead>
                                              <tr>
                                                <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '18%' : '20%', whiteSpace: 'nowrap' }}>관문</th>
                                                <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '41%' : '40%' }}>
                                                  <Form.Check
                                                    type="checkbox"
                                                    label={<span style={{ fontSize: isMobile ? '0.75rem' : '1rem', whiteSpace: 'nowrap' }}>클골</span>}
                                                    checked={getHeaderCheckState(character.characterName, raid.name, 'withMore')}
                                                    onChange={() => handleHeaderChange(character.characterName, raid.name, 'withMore')}
                                                    style={{ marginBottom: 0 }}
                                                  />
                                                </th>
                                                <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '41%' : '40%' }}>
                                                  <Form.Check
                                                    type="checkbox"
                                                    label={<span style={{ fontSize: isMobile ? '0.75rem' : '1rem', whiteSpace: 'nowrap' }}>더보기</span>}
                                                    checked={getHeaderCheckState(character.characterName, raid.name, 'withoutMore')}
                                                    onChange={() => handleHeaderChange(character.characterName, raid.name, 'withoutMore')}
                                                    style={{ marginBottom: 0 }}
                                                  />
                                                </th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {raid.gates.map((gate: any) => (
                                                <tr key={`${raid.name}-${gate.gate}`}>
                                                  <td style={{ padding: isMobile ? '0.15rem 0.2rem' : '0.5rem 0.6rem', whiteSpace: 'nowrap' }}>{gate.gate}관</td>
                                                  <td
                                                    onClick={() => handleGateChange(character.characterName, raid.name, gate.gate, 'withMore')}
                                                    style={{ padding: isMobile ? '0.15rem 0.2rem' : '0.5rem 0.6rem', cursor: 'pointer' }}
                                                  >
                                                    <Form.Check
                                                      type="radio"
                                                      name={`${character.characterName}-${raid.name}-${gate.gate}`}
                                                      id={`${character.characterName}-${raid.name}-${gate.gate}-with-more-hidden`}
                                                      label={<span style={{ fontSize: isMobile ? '0.75rem' : '1rem', whiteSpace: 'nowrap' }}>{gate.gold.toLocaleString()}</span>}
                                                      checked={gateSelection[character.characterName]?.[raid.name]?.[gate.gate] === 'withMore'}
                                                      onChange={() => {}}
                                                      style={{ marginBottom: 0 }}
                                                    />
                                                  </td>
                                                  <td
                                                    onClick={() => handleGateChange(character.characterName, raid.name, gate.gate, 'withoutMore')}
                                                    style={{ padding: isMobile ? '0.15rem 0.2rem' : '0.5rem 0.6rem', cursor: 'pointer' }}
                                                  >
                                                    <Form.Check
                                                      type="radio"
                                                      name={`${character.characterName}-${raid.name}-${gate.gate}`}
                                                      id={`${character.characterName}-${raid.name}-${gate.gate}-without-more-hidden`}
                                                      label={<span style={{ fontSize: isMobile ? '0.75rem' : '1rem', whiteSpace: 'nowrap' }}>{(gate.gold - gate.moreGold).toLocaleString()}</span>}
                                                      checked={gateSelection[character.characterName]?.[raid.name]?.[gate.gate] === 'withoutMore'}
                                                      onChange={() => {}}
                                                      style={{ marginBottom: 0 }}
                                                    />
                                                  </td>
                                                </tr>
                                              ))}
                                            </tbody>
                                          </Table>
                                        </Accordion.Body>
                                      </Accordion.Item>
                                      );
                                    })}
                                  </Accordion>
                                </Accordion.Body>
                              </Accordion.Item>
                            ))}
                          </div>
                        </Collapse>
                      </>
                    )}
                  </Accordion>
                </Card.Body>
              </Card>
            </Col>
          );
        })}
      </Row>
      <Card className="mt-2 total-gold-card" style={{ backgroundColor: 'var(--card-body-bg-stone)', border: '2px solid #fbbf24' }}>
        <Card.Body style={{ padding: isMobile ? '1rem' : '1.3rem' }}>
          <div style={{ position: 'relative' }}>
            {/* 가운데: 총 골드 */}
            <div className="text-center d-flex align-items-center justify-content-center gap-2" style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: isMobile ? '1.15rem' : '1.4rem' }}>
              <Image src="/gold.jpg" alt="골드" width={isMobile ? 28 : 36} height={isMobile ? 28 : 36} style={{ borderRadius: '5px' }} />
              총 골드: {calculateTotalGold().toLocaleString()} G
            </div>

            {/* 오른쪽: 상위 퍼센트 정보 */}
            {(() => {
              const totalGold = calculateTotalGold();
              if (totalGold > 0) {
                // 항상 더보기 미사용 기준(Full Reward)으로 계산
                const ranking = calculateRanking(totalGold, false);

                // 퍼센트별 색상 지정 (가시성 좋은 색상)
                let percentColor = '#6c757d'; // 회색 (기본)
                if (ranking <= 0.01) {
                  percentColor = '#dc3545'; // 진한 빨강 (최최상위 0.01%)
                } else if (ranking <= 7.6) {
                  percentColor = '#fd7e14'; // 주황 (최상위)
                } else if (ranking <= 15.0) {
                  percentColor = '#ffc107'; // 황금색 (상위)
                } else if (ranking <= 23.9) {
                  percentColor = '#0d6efd'; // 파랑 (중상위)
                } else if (ranking <= 60.5) {
                  percentColor = '#198754'; // 초록 (중위)
                }

                return (
                  <div style={{
                    position: isMobile ? 'relative' : 'absolute',
                    right: 0,
                    top: isMobile ? 0 : '0rem',
                    textAlign: 'right',
                    marginTop: isMobile ? '0.6rem' : 0
                  }}>
                    <p style={{
                      fontSize: isMobile ? '0.85rem' : '1rem',
                      color: 'var(--text-primary)',
                      marginBottom: '0.25rem',
                      fontWeight: 600
                    }}>
                      원정대 주간 골드 수급 상위 <span style={{ color: percentColor, fontWeight: 700 }}>{ranking}%</span>입니다
                    </p>
                    <p style={{
                      fontSize: isMobile ? '0.68rem' : '0.78rem',
                      color: 'var(--text-muted)',
                      marginBottom: 0,
                      fontStyle: 'italic'
                    }}>
                      * 1660 이상의 캐릭터 더보기를 하지 않는다는 가정
                    </p>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </Card.Body>
      </Card>
    </>
  );
}