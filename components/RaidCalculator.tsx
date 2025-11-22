'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Card, Table, Form, Badge, Accordion, Row, Col, Button, Collapse } from 'react-bootstrap';
import Image from 'next/image';
import { raids } from '@/data/raids';

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

// 레이드 이미지 매핑
const raidImages: { [key: string]: string } = {
  '베히모스': '/behemoth.jpg',
  '에키드나': '/echidna.jpg',
  '에기르': '/aegir.jpg',
  '카제로스': '/kazeros.jpg',
  '상아탑': '/ivory-tower.jpg',
  '일리아칸': '/illiakan.jpg',
  '아브렐슈드': '/abrelshud.jpg'
};

export default function RaidCalculator({ selectedCharacters }: RaidCalculatorProps) {
  const [gateSelection, setGateSelection] = useState<GateSelection>({});
  const [showAllRaids, setShowAllRaids] = useState<{ [key: string]: boolean }>({});
  const [isMobile, setIsMobile] = useState<boolean | undefined>(undefined);

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
                  className="character-raid-header d-flex align-items-center justify-content-between"
                  style={{
                    backgroundColor: 'var(--card-header-bg)',
                    borderColor: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    padding: isMobile ? '0.5rem 0.75rem' : '0.9rem 1.2rem',
                    gap: '0.5rem',
                    flexWrap: 'nowrap',
                    overflow: 'hidden'
                  }}
                >
                  <div className="d-flex align-items-center gap-1" style={{ minWidth: 0, flex: '1 1 auto' }}>
                    <span style={{
                      fontSize: isMobile ? '0.85rem' : '1.1rem',
                      fontWeight: 600,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {character.characterName}
                    </span>
                    <Badge
                      style={{
                        fontSize: isMobile ? '0.6rem' : '0.78rem',
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
                  <div className="d-flex align-items-center gap-1" style={{
                    backgroundColor: '#fef3c7',
                    padding: '0.35em 0.6em',
                    borderRadius: '6px',
                    border: '1px solid #fbbf24',
                    flexShrink: 0,
                    whiteSpace: 'nowrap'
                  }}>
                    <Image src="/gold.jpg" alt="골드" width={isMobile ? 14 : 18} height={isMobile ? 14 : 18} style={{ borderRadius: '3px' }} />
                    <span style={{
                      fontSize: isMobile ? '0.65rem' : '0.85rem',
                      fontWeight: 700,
                      color: '#92400e'
                    }}>
                      {calculateCharacterGold(character.characterName).toLocaleString()}
                    </span>
                  </div>
                </Card.Header>
                <Card.Body style={{ padding: isMobile ? '0.5rem' : '1.25rem 1.25rem 1rem' }}>
                  <Accordion flush className="theme-accordion">
                    {/* 체크된 레이드 그룹들 */}
                    {checkedGroups.map(groupName => (
                      <Accordion.Item eventKey={groupName} key={groupName} className="raid-group-accordion">
                        <Accordion.Header style={{ fontSize: isMobile ? '0.8rem' : '1rem', padding: isMobile ? '0.5rem' : '0.75rem' }}>
                          <div className="d-flex align-items-center w-100">
                            {raidImages[groupName] && (
                              <img
                                src={raidImages[groupName]}
                                alt={groupName}
                                width={isMobile ? 16 : 20}
                                height={isMobile ? 16 : 20}
                                style={{ marginRight: '0.4rem', borderRadius: '4px', flexShrink: 0 }}
                              />
                            )}
                            <span style={{ fontWeight: 600 }}>{groupName}</span>
                            <Badge bg="success" className="ms-1" style={{ fontSize: isMobile ? '0.55rem' : '0.73rem' }}>
                              {calculateRaidGroupGold(character.characterName, groupName).toLocaleString()} G
                            </Badge>
                            {hasMoreSelected(character.characterName, groupName) && (
                              <Badge bg="danger" className="ms-1" style={{ fontSize: isMobile ? '0.5rem' : '0.68rem' }}>더보기</Badge>
                            )}
                          </div>
                        </Accordion.Header>
                        <Accordion.Body style={{ padding: isMobile ? '0.5rem' : '1.2rem' }}>
                          <Accordion flush>
                            {groupedRaids[groupName].map(raid => {
                              const isSelected = hasAnyGateSelected(character.characterName, raid.name);
                              return (
                              <Accordion.Item eventKey={raid.name} key={raid.name} className="raid-difficulty-accordion">
                                <Accordion.Header style={{ fontSize: isMobile ? '0.75rem' : '0.95rem', padding: isMobile ? '0.4rem' : '0.6rem' }}>
                                  <span style={{ fontWeight: isSelected ? 600 : 400 }}>{raid.name}</span>
                                  <Badge bg="secondary" className="ms-1" style={{ fontSize: isMobile ? '0.5rem' : '0.68rem' }}>
                                    {raid.level}
                                  </Badge>
                                  {isSelected && (
                                    <Badge bg="success" className="ms-1" style={{ fontSize: isMobile ? '0.5rem' : '0.65rem' }}>✓</Badge>
                                  )}
                                </Accordion.Header>
                                <Accordion.Body style={{ padding: isMobile ? '0.25rem' : '0.9rem' }}>
                                  <Table striped bordered hover responsive className="raid-table mb-0" style={{ fontSize: isMobile ? '0.65rem' : '0.9rem', tableLayout: 'fixed' }}>
                                    <thead>
                                      <tr>
                                        <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '18%' : '20%', whiteSpace: 'nowrap' }}>관문</th>
                                        <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '41%' : '40%' }}>
                                          <Form.Check
                                            type="checkbox"
                                            label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>클골</span>}
                                            checked={getHeaderCheckState(character.characterName, raid.name, 'withMore')}
                                            onChange={() => handleHeaderChange(character.characterName, raid.name, 'withMore')}
                                            style={{ marginBottom: 0 }}
                                          />
                                        </th>
                                        <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '41%' : '40%' }}>
                                          <Form.Check
                                            type="checkbox"
                                            label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>더보기</span>}
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
                                              label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>{gate.gold.toLocaleString()}</span>}
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
                                              label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>{(gate.gold - gate.moreGold).toLocaleString()}</span>}
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
                                <span style={{ marginRight: '0.4rem' }}>▲</span>
                                다른 레이드 접기
                              </>
                            ) : (
                              <>
                                <span style={{ marginRight: '0.4rem' }}>▼</span>
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
                                <Accordion.Header style={{ fontSize: isMobile ? '0.8rem' : '1rem', padding: isMobile ? '0.5rem' : '0.75rem' }}>
                                  <div className="d-flex align-items-center w-100">
                                    {raidImages[groupName] && (
                                      <img
                                        src={raidImages[groupName]}
                                        alt={groupName}
                                        width={isMobile ? 16 : 20}
                                        height={isMobile ? 16 : 20}
                                        style={{ marginRight: '0.4rem', borderRadius: '4px', flexShrink: 0 }}
                                      />
                                    )}
                                    <span style={{ fontWeight: 600, opacity: 0.7 }}>{groupName}</span>
                                    <Badge bg="secondary" className="ms-1" style={{ fontSize: isMobile ? '0.55rem' : '0.73rem' }}>
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
                                        <Accordion.Header style={{ fontSize: isMobile ? '0.75rem' : '0.95rem', padding: isMobile ? '0.4rem' : '0.6rem' }}>
                                          <span style={{ fontWeight: isSelected ? 600 : 400 }}>{raid.name}</span>
                                          <Badge bg="secondary" className="ms-1" style={{ fontSize: isMobile ? '0.5rem' : '0.68rem' }}>
                                            {raid.level}
                                          </Badge>
                                          {isSelected && (
                                            <Badge bg="success" className="ms-1" style={{ fontSize: isMobile ? '0.5rem' : '0.65rem' }}>✓</Badge>
                                          )}
                                        </Accordion.Header>
                                        <Accordion.Body style={{ padding: isMobile ? '0.25rem' : '0.9rem' }}>
                                          <Table striped bordered hover responsive className="raid-table mb-0" style={{ fontSize: isMobile ? '0.65rem' : '0.9rem', tableLayout: 'fixed' }}>
                                            <thead>
                                              <tr>
                                                <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '18%' : '20%', whiteSpace: 'nowrap' }}>관문</th>
                                                <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '41%' : '40%' }}>
                                                  <Form.Check
                                                    type="checkbox"
                                                    label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>클골</span>}
                                                    checked={getHeaderCheckState(character.characterName, raid.name, 'withMore')}
                                                    onChange={() => handleHeaderChange(character.characterName, raid.name, 'withMore')}
                                                    style={{ marginBottom: 0 }}
                                                  />
                                                </th>
                                                <th style={{ padding: isMobile ? '0.2rem' : '0.6rem', width: isMobile ? '41%' : '40%' }}>
                                                  <Form.Check
                                                    type="checkbox"
                                                    label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>더보기</span>}
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
                                                      label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>{gate.gold.toLocaleString()}</span>}
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
                                                      label={<span style={{ fontSize: isMobile ? '0.6rem' : '0.82rem', whiteSpace: 'nowrap' }}>{(gate.gold - gate.moreGold).toLocaleString()}</span>}
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
      <Card className="mt-3 mt-md-4 total-gold-card" style={{ backgroundColor: 'var(--card-body-bg-stone)', border: '2px solid #fbbf24' }}>
        <Card.Body style={{ padding: isMobile ? '0.75rem' : '1rem' }}>
          <div className="text-center d-flex align-items-center justify-content-center gap-2" style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: isMobile ? '1rem' : '1.25rem' }}>
            <Image src="/gold.jpg" alt="골드" width={isMobile ? 24 : 32} height={isMobile ? 24 : 32} style={{ borderRadius: '4px' }} />
            총 골드: {calculateTotalGold().toLocaleString()} G
          </div>
        </Card.Body>
      </Card>
    </>
  );
}