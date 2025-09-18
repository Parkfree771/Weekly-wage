'use client';

import { useState, useEffect, memo } from 'react';
import { Container, Row, Col, Card, Button, Badge, Alert } from 'react-bootstrap';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  RaidComposition, 
  PartyMember, 
  CLASS_LIST, 
  SYNERGY_DATA,
  SYNERGY_CATEGORIES 
} from '@/lib/synergyData';
import { SynergyAnalyzer } from '@/lib/synergyAnalyzer';

const createInitialParty = (): PartyMember[] => ([
  { position: 1, class: null },
  { position: 2, class: null },
  { position: 3, class: null },
  { position: 4, class: null }
]);

const SortableClassSlot = memo(function SortableClassSlot({ 
  id,
  party, 
  member, 
  partyNumber,
  onRemove,
  onAddClass,
  supporterClasses
}: {
  id: string;
  party: 'party1' | 'party2';
  member: PartyMember;
  partyNumber: number;
  onRemove: (party: 'party1' | 'party2', position: number) => void;
  onAddClass?: (className: string, isSupporter?: boolean) => void;
  supporterClasses: string[];
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !member.class });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isSupporter = member.position === 4;
  
  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes} 
      {...listeners}
      className={`border rounded p-2 mb-2 ${member.class ? 'bg-light' : 'bg-white'}`}
    >
      <div className="small text-muted mb-1">
        {isSupporter ? `${partyNumber}파티 서포터` : `${partyNumber}파티 ${member.position}번`}
      </div>
      {member.class ? (
        <div className="d-flex justify-content-between align-items-center">
          <div>
            <strong>{member.class}</strong>
            {SYNERGY_DATA[member.class].isSupporter ? (
              <Badge bg="success" className="ms-1 small">서포터</Badge>
            ) : (
              <div className="small text-muted">
                {SYNERGY_DATA[member.class].synergies.map(s => s.type).join(', ')}
              </div>
            )}
          </div>
          <Button 
            variant="outline-danger" 
            size="sm"
            onPointerDown={(e) => {
              e.stopPropagation();
              onRemove(party, member.position)
            }}
          >
            ✕
          </Button>
        </div>
      ) : (
        <>
          <div className="text-muted small">
            {isSupporter ? '서포터를 선택하세요' : '빈 슬롯'}
          </div>
          {isSupporter && (
            <div className="mt-2">
              <div className="d-flex flex-wrap gap-1">
                {supporterClasses.map(className => (
                  <Button
                    key={className}
                    variant="outline-success"
                    size="sm"
                    onClick={() => onAddClass && onAddClass(className, true)}
                    style={{ fontSize: '0.75rem', padding: '2px 6px' }}
                  >
                    {className}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
});

export default function RaidSynergyAnalyzer() {
  const [composition, setComposition] = useState<RaidComposition>({
    party1: createInitialParty(),
    party2: createInitialParty()
  });
  const [analyzer, setAnalyzer] = useState<SynergyAnalyzer | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    const newAnalyzer = new SynergyAnalyzer(composition);
    setAnalyzer(newAnalyzer);
  }, [composition]);

  const dealerClasses = CLASS_LIST.filter(className => !SYNERGY_DATA[className].isSupporter);
  const supporterClasses = CLASS_LIST.filter(className => SYNERGY_DATA[className].isSupporter);

  const addClass = (className: string, isSupporter: boolean = false) => {
    setComposition(prev => {
      const newComp = { 
        party1: [...prev.party1], 
        party2: [...prev.party2] 
      };
      
      if (isSupporter) {
        if (!newComp.party1[3].class) {
          newComp.party1[3] = { position: 4, class: className };
        } else if (!newComp.party2[3].class) {
          newComp.party2[3] = { position: 4, class: className };
        }
      } else {
        for (let i = 0; i < 3; i++) {
          if (!newComp.party1[i].class) {
            newComp.party1[i] = { position: i + 1, class: className };
            return newComp;
          }
        }
        for (let i = 0; i < 3; i++) {
          if (!newComp.party2[i].class) {
            newComp.party2[i] = { position: i + 1, class: className };
            return newComp;
          }
        }
      }
      
      return newComp;
    });
  };

  const removeClass = (party: 'party1' | 'party2', position: number) => {
    setComposition(prev => {
      const newParty = prev[party].map(member => {
        if (member.position === position) {
          return { ...member, class: null };
        }
        return member;
      });
      return {
        ...prev,
        [party]: newParty,
      };
    });
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const activeId = active.id.toString();
      const overId = over.id.toString();

      const [fromParty, fromPosStr] = activeId.split('-');
      const [toParty, toPosStr] = overId.split('-');
      const fromPos = parseInt(fromPosStr, 10);
      const toPos = parseInt(toPosStr, 10);

      setComposition(prev => {
        const newComp = {
          party1: [...prev.party1],
          party2: [...prev.party2],
        };

        const fromMember = newComp[fromParty as keyof RaidComposition].find(m => m.position === fromPos);
        const toMember = newComp[toParty as keyof RaidComposition].find(m => m.position === toPos);

        if (!fromMember || !toMember) return prev;

        const fromClass = fromMember.class;
        const toClass = toMember.class;
        
        const fromIsSupporter = fromClass ? SYNERGY_DATA[fromClass].isSupporter : false;

        if (fromPos !== 4 && toPos === 4) return prev;
        if (fromPos === 4 && toPos !== 4) return prev;
        if (toClass && SYNERGY_DATA[toClass].isSupporter && fromPos !== 4) return prev;
        if (toClass && !SYNERGY_DATA[toClass].isSupporter && fromPos === 4) return prev;

        const fromPartyKey = fromParty as keyof RaidComposition;
        const toPartyKey = toParty as keyof RaidComposition;

        const fromIndex = newComp[fromPartyKey].findIndex(m => m.position === fromPos);
        const toIndex = newComp[toPartyKey].findIndex(m => m.position === toPos);

        if (fromIndex === -1 || toIndex === -1) return prev;

        newComp[fromPartyKey][fromIndex] = { ...newComp[fromPartyKey][fromIndex], class: toClass };
        newComp[toPartyKey][toIndex] = { ...newComp[toPartyKey][toIndex], class: fromClass };

        return newComp;
      });
    }
  };

  const clearAll = () => {
    setComposition({
      party1: createInitialParty(),
      party2: createInitialParty()
    });
  };

  const renderClassButton = (className: string, isSupporter: boolean = false) => {
    const classData = SYNERGY_DATA[className];
    const synergyText = classData.synergies.map(s => s.type).join(', ');
    
    const hasEmptySlot = isSupporter 
      ? !composition.party1[3].class || !composition.party2[3].class
      : [...composition.party1.slice(0, 3), ...composition.party2.slice(0, 3)].some(member => !member.class);
    
    return (
      <Button
        key={className}
        variant="outline-primary"
        size="sm"
        className="mb-2 me-2"
        onClick={() => addClass(className, isSupporter)}
        disabled={!hasEmptySlot}
        style={{ minWidth: '120px', textAlign: 'left' }}
      >
        <div>
          <strong>{className}</strong>
          {isSupporter ? (
            <div className="small text-muted">서포터</div>
          ) : (
            <div className="small text-muted">{synergyText}</div>
          )}
        </div>
      </Button>
    );
  };

  const renderPartyAnalysis = (partyNumber: 1 | 2) => {
    if (!analyzer) return null;

    const partyMembers = composition[partyNumber === 1 ? 'party1' : 'party2'];
    const allSynergies = partyMembers
        .filter(m => m.class)
        .flatMap(m => SYNERGY_DATA[m.class!].synergies.map(s => s.type));

    const synergyCounts = allSynergies.reduce((acc, type) => {
        acc[type] = (acc[type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const duplicateSynergies = Object.entries(synergyCounts)
        .filter(([, count]) => count > 1)
        .map(([type]) => type);
    
    const inefficientSynergies: string[] = duplicateSynergies.filter(type => type !== '방어력 감소');
    const boostedSynergies: string[] = duplicateSynergies.filter(type => type === '방어력 감소');

    const partyAnalysis = analyzer.getPartyAnalysis(partyNumber);
    const partySynergies = partyAnalysis.currentSynergies;
    const otherPartyNumber = partyNumber === 1 ? 2 : 1;


    const getBadgeInfo = (type: string): { variant: string; text: string } => {
      if (boostedSynergies.includes(type)) {
        return { variant: 'info', text: '효율 증가' };
      }
      if (inefficientSynergies.includes(type)) {
        return { variant: 'warning', text: '효율 감소' };
      }
      return { variant: 'success', text: '' };
    };

    return (
      <Card className="border-0 shadow-sm mb-3">
        <Card.Header className={`${partyNumber === 1 ? 'bg-primary' : 'bg-secondary'} text-white`}>
          <h6 className="mb-0">{partyNumber}파티 분석</h6>
        </Card.Header>
        <Card.Body className="py-3">
          <div className="mb-3">
            <div className="small fw-bold mb-2">시너지 현황</div>

            {(() => {
              // 클래스별로 시너지 정리
              const classSynergies: { [className: string]: Array<{ type: string; value: number }> } = {};

              partyAnalysis.members.forEach(member => {
                if (!member.class) return;
                const classData = SYNERGY_DATA[member.class];
                if (!classData || classData.isSupporter) return;

                if (!classSynergies[member.class]) {
                  classSynergies[member.class] = [];
                }

                classData.synergies.forEach(synergy => {
                  classSynergies[member.class].push({
                    type: synergy.type,
                    value: synergy.value
                  });
                });
              });

              return (
                <div>
                  {Object.keys(classSynergies).length === 0 ? (
                    <div className="text-muted small">시너지를 제공하는 클래스가 없습니다.</div>
                  ) : (
                    Object.entries(classSynergies).map(([className, synergies]) => (
                      <div key={className} className="mb-2">
                        <div className="fw-bold text-body mb-1">{className}</div>
                        {synergies.map((synergy, index) => (
                          <div key={index} className="small text-muted ms-3">
                            • {synergy.type === '치명타 적중률 증가' ? '치적' : synergy.type} {synergy.value}%
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              );
            })()}
          </div>

          <div className="mb-3">
            <div className="small fw-bold mb-2">중복 시너지 분석</div>

            {(() => {
              const duplicateSynergies = Object.entries(partySynergies).filter(([, data]) => data.providers.length > 1);
              const singleSynergies = Object.entries(partySynergies).filter(([, data]) => data.providers.length === 1);

              return (
                <>
                  {duplicateSynergies.length > 0 && (
                    <div className="mb-3">
                      <div className="small text-secondary fw-bold mb-2">중복 시너지</div>
                      {duplicateSynergies.map(([type, data]) => {
                        const badgeInfo = getBadgeInfo(type);
                        // @ts-ignore
                        const calculatedValues = data.calculatedValues || [];

                        return (
                          <div key={type} className="mb-3 p-2 border rounded">
                            {calculatedValues.map((synergy: any, index: number) => (
                              <div key={`${synergy.provider}-${index}`} className="d-flex justify-content-between align-items-center">
                                <span className="small text-muted">
                                  <strong className="me-2 text-body">{synergy.provider}</strong>
                                  {type === '치명타 적중률 증가' ? `치적 ${synergy.value}%` : `${type} ${synergy.value}% → 데미지 증가`}
                                </span>
                                <Badge bg="light" text="dark" className="small fw-normal">{synergy.efficiency}%</Badge>
                              </div>
                            ))}
                            <div className="d-flex justify-content-between align-items-center mt-1 border-top pt-1">
                              <span className={`small fw-bold ${badgeInfo.variant === 'info' ? 'text-danger' : 'text-primary'}`} style={{
                                color: badgeInfo.variant === 'info' ? '#dc3545' : '#0066cc',
                                fontWeight: '700'
                              }}>
                                총합 ({badgeInfo.variant === 'info' ? '+' : '-'}{badgeInfo.text})
                              </span>
                              <Badge
                                bg={badgeInfo.variant === 'info' ? 'danger' : 'primary'}
                                className="small fw-bold"
                                style={{ fontSize: '0.8rem' }}
                              >
                                {data.value}%
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {singleSynergies.length > 0 && (
                    <div>
                      <div className="small text-secondary fw-bold mb-2">개별 시너지</div>
                      {singleSynergies.map(([type, data]) => {
                        const provider = data.providers[0];
                        const classData = SYNERGY_DATA[provider];
                        const originalSynergy = classData?.synergies.find(s => s.type === type);
                        const originalValue = originalSynergy?.value || 0;

                        return (
                          <div key={type} className="d-flex justify-content-between align-items-center mb-1">
                            <span className="small">
                              <strong className="me-2">{provider}</strong>
{type === '치명타 적중률 증가' ? `치적 ${originalValue}%` : `${type} ${originalValue}% → 데미지 증가`}
                            </span>
                            <Badge bg="success" className="small">{data.value}%</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {Object.keys(partySynergies).length === 0 && (
                    <div className="text-muted small">시너지 없음</div>
                  )}
                </>
              );
            })()}
          </div>

        </Card.Body>
      </Card>
    );
  };

  return (
    <DndContext 
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <Container fluid className="raid-synergy-analyzer">
        <Row>
          <Col md={12} lg={4}>
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-primary text-white">
                <h5 className="mb-0">클래스 선택</h5>
              </Card.Header>
              <Card.Body>
                <h6 className="mb-3">딜러 클래스</h6>
                {SYNERGY_CATEGORIES.map(category => (
                  <div key={category} className="mb-3">
                    <div className="small fw-bold text-secondary mb-2">{category}</div>
                    {dealerClasses
                      .filter(className => SYNERGY_DATA[className].category === category)
                      .map(className => renderClassButton(className, false))}
                  </div>
                ))}
                <hr />
                <h6 className="mb-3">서포터 클래스</h6>
                <div className="text-muted small mb-3">
                  서포터는 각 파티의 서포터 슬롯에서 직접 선택할 수 있습니다.
                </div>
                <div className="d-flex flex-wrap gap-2">
                  {supporterClasses.map(className => (
                    <Badge key={className} bg="success" className="py-1 px-2">
                      {className}
                    </Badge>
                  ))}
                </div>
                <hr />
                <Button variant="outline-secondary" onClick={clearAll} className="w-100">
                  전체 초기화
                </Button>
              </Card.Body>
            </Card>
          </Col>

          <Col md={12} lg={4}>
            <Card className="border-0 shadow-sm mb-4">
              <Card.Header className="bg-info text-white">
                <h5 className="mb-0">공격대 편성</h5>
              </Card.Header>
              <Card.Body>
                <SortableContext 
                  items={composition.party1.map(m => `party1-${m.position}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <h6 className="mb-3">1파티</h6>
                  {composition.party1.map(member => 
                    <SortableClassSlot
                      key={`party1-${member.position}`}
                      id={`party1-${member.position}`}
                      party="party1"
                      member={member}
                      partyNumber={1}
                      onRemove={removeClass}
                      onAddClass={addClass}
                      supporterClasses={supporterClasses}
                    />
                  )}
                </SortableContext>
                <hr />
                <SortableContext 
                  items={composition.party2.map(m => `party2-${m.position}`)}
                  strategy={verticalListSortingStrategy}
                >
                  <h6 className="mb-3">2파티</h6>
                  {composition.party2.map(member => 
                    <SortableClassSlot
                      key={`party2-${member.position}`}
                      id={`party2-${member.position}`}
                      party="party2"
                      member={member}
                      partyNumber={2}
                      onRemove={removeClass}
                      onAddClass={addClass}
                      supporterClasses={supporterClasses}
                    />
                  )}
                </SortableContext>
              </Card.Body>
            </Card>
          </Col>

          <Col md={12} lg={4}>
            {analyzer && (
              <>
                {renderPartyAnalysis(1)}
                {renderPartyAnalysis(2)}
              </>
            )}
          </Col>
        </Row>
      </Container>
    </DndContext>
  );
}