'use client';

import React, { useState, useEffect } from 'react';
import { Card, Table, Form, Badge, Accordion, Row, Col } from 'react-bootstrap';
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

const groupRaids = () => {
  const grouped: { [key: string]: any[] } = {};
  raids.forEach(raid => {
    const groupName = raid.name.split(' ')[0];
    if (!grouped[groupName]) {
      grouped[groupName] = [];
    }
    grouped[groupName].push(raid);
  });
  return grouped;
};

export default function RaidCalculator({ selectedCharacters }: RaidCalculatorProps) {
  const [gateSelection, setGateSelection] = useState<GateSelection>({});
  const groupedRaids = groupRaids();

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

  if (selectedCharacters.length === 0) {
    return (
      <div className="text-center p-5">
      </div>
    );
  }

  return (
    <>
      <Row>
        {selectedCharacters.map(character => (
          <Col md={4} key={character.characterName} className="mb-4">
            <Card className="character-raid-card" style={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)' }}>
              <Card.Header as="h5" className="character-raid-header" style={{ backgroundColor: 'var(--card-header-bg)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}>
                {character.characterName} <Badge bg="info">Lv. {character.itemLevel}</Badge>
                <Badge bg="warning" className="ms-2">{calculateCharacterGold(character.characterName).toLocaleString()} G</Badge>
              </Card.Header>
              <Card.Body>
                <Accordion flush className="theme-accordion">
                  {Object.keys(groupedRaids).map(groupName => (
                    <Accordion.Item eventKey={groupName} key={groupName} className="raid-group-accordion">
                      <Accordion.Header>
                        {groupName}
                        <Badge bg="success" className="ms-2">{calculateRaidGroupGold(character.characterName, groupName).toLocaleString()} G</Badge>
                        {hasMoreSelected(character.characterName, groupName) && <Badge bg="danger" className="ms-2">더보기</Badge>}
                      </Accordion.Header>
                      <Accordion.Body>
                        <Accordion flush>
                          {groupedRaids[groupName].map(raid => (
                            <Accordion.Item
                              eventKey={raid.name}
                              key={raid.name}
                              className="raid-difficulty-accordion"
                            >
                              <Accordion.Header>{raid.name} <Badge bg="secondary" className="ms-2">Lv. {raid.level}</Badge></Accordion.Header>
                              <Accordion.Body>
                                <Table striped bordered hover responsive className="raid-table">
                                  <thead>
                                    <tr>
                                      <th>관문</th>
                                      <th>
                                        <Form.Check
                                          type="checkbox"
                                          label="클골"
                                          checked={getHeaderCheckState(character.characterName, raid.name, 'withMore')}
                                          onChange={() => handleHeaderChange(character.characterName, raid.name, 'withMore')}
                                        />
                                      </th>
                                      <th>
                                        <Form.Check
                                          type="checkbox"
                                          label="더보기⭕"
                                          checked={getHeaderCheckState(character.characterName, raid.name, 'withoutMore')}
                                          onChange={() => handleHeaderChange(character.characterName, raid.name, 'withoutMore')}
                                        />
                                      </th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {raid.gates.map((gate: any) => (
                                      <tr key={`${raid.name}-${gate.gate}`}>
                                        <td>{gate.gate}관</td>
                                        <td onClick={() => handleGateChange(character.characterName, raid.name, gate.gate, 'withMore')}>
                                          <Form.Check
                                            type="radio"
                                            name={`${character.characterName}-${raid.name}-${gate.gate}`}
                                            id={`${character.characterName}-${raid.name}-${gate.gate}-with-more`}
                                            label={gate.gold.toLocaleString() + ' G'}
                                            checked={gateSelection[character.characterName]?.[raid.name]?.[gate.gate] === 'withMore'}
                                            onChange={() => {}}
                                          />
                                        </td>
                                        <td onClick={() => handleGateChange(character.characterName, raid.name, gate.gate, 'withoutMore')}>
                                          <Form.Check
                                            type="radio"
                                            name={`${character.characterName}-${raid.name}-${gate.gate}`}
                                            id={`${character.characterName}-${raid.name}-${gate.gate}-without-more`}
                                            label={(gate.gold - gate.moreGold).toLocaleString() + ' G'}
                                            checked={gateSelection[character.characterName]?.[raid.name]?.[gate.gate] === 'withoutMore'}
                                            onChange={() => {}}
                                          />
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </Table>
                              </Accordion.Body>
                            </Accordion.Item>
                          ))}
                        </Accordion>
                      </Accordion.Body>
                    </Accordion.Item>
                  ))}
                </Accordion>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
      <Card className="mt-4 total-gold-card" style={{ backgroundColor: 'var(--primary-brand)', color: 'white' }}>
        <Card.Body>
          <h4 className="text-center">총 골드: {calculateTotalGold().toLocaleString()} G</h4>
        </Card.Body>
      </Card>
    </>
  );
}