'use client';

// 착장 등록 폼 (로그인 사용자) — 캡쳐 + 직업 + 착용 아바타(부위·이름·염색).
// 아바타 정보는 두 길:
//   1) 캐릭터명으로 불러오기 — /api/lostark/avatars (로아 API 1회). 직업·캐릭터 이미지도 같이 온다.
//      겉에 입은 옷 부위만 채운다(이동 효과 등은 뺀다).
//   2) 직접 입력 — 게임 염색 창의 코드(FFFFFF)를 그대로 붙여넣는다. API 갱신이 늦을 때 쓴다.
// 불러온 뒤에도 아래 입력칸에서 고치거나 줄을 지울 수 있다(두 길이 같은 편집기를 쓴다).

import { useEffect, useRef, useState } from 'react';
import type { AvatarLook, StoredImage } from '@/types/package';
import {
  AVATAR_PARTS,
  CLASS_GROUPS,
  LOSTARK_CLASSES,
  cleanPieces,
  normalizeHex,
  wearablePieces,
  type AvatarPiece,
} from '@/lib/avatar-dye';
import { MAX_SOURCE_BYTES, type CropRect } from '@/lib/avatar-image';
import CoverCropper from './CoverCropper';
import av from './Avatar.module.css';

const MAX_DYE_AREAS = 3;
/** 착장 하나에 올리는 사진 상한 — firestore.rules 의 images 길이 검사와 같은 값 */
export const MAX_LOOK_IMAGES = 8;

type Shot = { id: number; file: File; url: string };

type DraftDye = { area: string; base: string; pattern: string; gloss: string };
type DraftPiece = { key: number; part: string; name: string; grade: string; isInner: boolean; icon?: string; dyes: DraftDye[] };

let keySeq = 0;
const nextKey = () => ++keySeq;

const emptyPiece = (): DraftPiece => ({ key: nextKey(), part: '상의 아바타', name: '', grade: '', isInner: false, dyes: [] });

function toDraft(p: AvatarPiece): DraftPiece {
  return {
    key: nextKey(),
    part: p.part,
    name: p.name,
    grade: p.grade,
    isInner: p.isInner,
    icon: p.icon,
    dyes: p.dyes.map((d) => ({ area: d.area, base: d.base.replace(/^#/, ''), pattern: d.pattern.replace(/^#/, ''), gloss: d.gloss })),
  };
}

/** 색 입력칸 — 'FFFFFF' · '#FFFFFF' 둘 다 받는다. 맞는 코드면 옆에 색 칸을 띄운다 */
function HexInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const hex = normalizeHex(value);
  const bad = value.trim() !== '' && !hex;
  return (
    <span className={`${av.hexField} ${bad ? av.hexFieldBad : ''}`}>
      <span className={av.hexSwatch} style={hex ? { background: hex } : undefined} aria-hidden="true" />
      <span className={av.hexHash}>#</span>
      <input
        type="text"
        className={av.hexInput}
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/^#/, '').replace(/\s/g, '').slice(0, 6))}
        // 붙여넣은 값에 '#' 이나 공백이 섞여도 6자리만 남긴다
        onPaste={(e) => {
          const t = e.clipboardData.getData('text');
          const m = t.match(/[0-9a-fA-F]{6}/);
          if (m) { e.preventDefault(); onChange(m[0].toUpperCase()); }
        }}
        placeholder="FFFFFF"
        maxLength={7}
        spellCheck={false}
        autoComplete="off"
        aria-label={label}
      />
    </span>
  );
}

type Props = {
  postId: string;
  uid: string;
  authorName: string;
  /** 지금 상세에서 고른 직업 — 폼의 기본값 */
  defaultClass: string | null;
  onCreated: (look: AvatarLook) => void;
  onCancel: () => void;
};

export default function AvatarLookForm({ postId, uid, authorName, defaultClass, onCreated, onCancel }: Props) {
  const [className, setClassName] = useState<string>(defaultClass ?? '');
  // 올릴 사진들 — 대표(coverId)가 갤러리 썸네일이 된다
  const [shots, setShots] = useState<Shot[]>([]);
  const [coverId, setCoverId] = useState<number | null>(null);
  // 사진별 대표 틀(목록 썸네일 자를 영역) — 대표를 바꿨다 돌아와도 맞춰 둔 틀이 남는다
  const [crops, setCrops] = useState<Record<number, CropRect>>({});
  const coverShot = shots.find((s) => s.id === coverId) ?? null;
  const [progress, setProgress] = useState<string | null>(null);
  const [pieces, setPieces] = useState<DraftPiece[]>([]);
  const [source, setSource] = useState<'api' | 'manual'>('manual');
  const [charName, setCharName] = useState('');
  const [apiLoading, setApiLoading] = useState(false);
  const [apiMsg, setApiMsg] = useState<string | null>(null);
  // 불러온 캐릭터 이미지 — 확인용으로 작게만 보여 준다(저장하지 않는다)
  const [charImage, setCharImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 미리보기 주소는 폼이 닫힐 때 한꺼번에 푼다
  const shotsRef = useRef<Shot[]>([]);
  shotsRef.current = shots;
  useEffect(() => () => { shotsRef.current.forEach((s) => URL.revokeObjectURL(s.url)); }, []);

  const addFiles = (list: FileList | File[] | null | undefined) => {
    const files = Array.from(list ?? []);
    if (files.length === 0) return;
    let msg: string | null = null;
    const ok: Shot[] = [];
    for (const f of files) {
      if (!f.type.startsWith('image/')) { msg = '이미지 파일만 올릴 수 있습니다.'; continue; }
      if (f.size > MAX_SOURCE_BYTES) { msg = '20MB 넘는 이미지는 뺐습니다.'; continue; }
      ok.push({ id: nextKey(), file: f, url: URL.createObjectURL(f) });
    }
    const current = shotsRef.current;
    const room = MAX_LOOK_IMAGES - current.length;
    if (ok.length > room) {
      msg = `사진은 ${MAX_LOOK_IMAGES}장까지 올릴 수 있습니다.`;
      ok.slice(Math.max(0, room)).forEach((s) => URL.revokeObjectURL(s.url));
    }
    const added = ok.slice(0, Math.max(0, room));
    if (current.length === 0 && added[0]) setCoverId(added[0].id);
    setShots([...current, ...added]);
    setErrors((p) => {
      const n = { ...p };
      if (msg) n.image = msg; else delete n.image;
      return n;
    });
  };

  const removeShot = (id: number) => {
    const target = shots.find((s) => s.id === id);
    if (target) URL.revokeObjectURL(target.url);
    const next = shots.filter((s) => s.id !== id);
    setShots(next);
    if (coverId === id) setCoverId(next[0]?.id ?? null);
  };

  // 캡쳐 붙여넣기(Ctrl+V) — 색 입력칸에 글자를 붙일 때는 이미지가 없으므로 영향 없다
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith('image/'));
      const f = item?.getAsFile();
      if (f) { e.preventDefault(); addFiles([f]); }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, []);

  // 로아 API 1회 — 직업·캐릭터 이미지 + 겉에 입은 옷 부위만 편집기에 채운다
  const loadFromApi = async () => {
    const name = charName.trim();
    if (!name || apiLoading) return;
    setApiLoading(true);
    setApiMsg(null);
    try {
      const res = await fetch(`/api/lostark/avatars?characterName=${encodeURIComponent(name)}`);
      const json = await res.json().catch(() => null);
      if (!res.ok) { setApiMsg(json?.message || '불러오지 못했습니다.'); return; }
      const visible = wearablePieces((json?.avatars ?? []) as AvatarPiece[]);
      setCharImage(typeof json?.characterImage === 'string' ? json.characterImage : null);
      if (typeof json?.className === 'string' && LOSTARK_CLASSES.includes(json.className)) {
        setClassName(json.className);
      }
      if (visible.length === 0) { setPieces([]); setApiMsg('착용 중인 아바타가 없습니다.'); return; }
      setPieces(visible.map(toDraft));
      setSource('api');
      setApiMsg(`${visible.length}개 불러옴 · 필요 없는 건 지우고, 다르면 고쳐 주세요`);
    } catch {
      setApiMsg('불러오지 못했습니다. 잠시 뒤 다시 시도하거나 직접 입력해 주세요.');
    } finally {
      setApiLoading(false);
    }
  };

  const updatePiece = (key: number, patch: Partial<DraftPiece>) =>
    setPieces((prev) => prev.map((p) => (p.key === key ? { ...p, ...patch } : p)));
  const updateDye = (key: number, idx: number, patch: Partial<DraftDye>) =>
    setPieces((prev) => prev.map((p) => (p.key === key
      ? { ...p, dyes: p.dyes.map((d, i) => (i === idx ? { ...d, ...patch } : d)) }
      : p)));
  const addDye = (key: number) =>
    setPieces((prev) => prev.map((p) => (p.key === key && p.dyes.length < MAX_DYE_AREAS
      ? { ...p, dyes: [...p.dyes, { area: `부위${p.dyes.length + 1}`, base: '', pattern: '', gloss: '' }] }
      : p)));
  const removeDye = (key: number, idx: number) =>
    setPieces((prev) => prev.map((p) => (p.key === key
      ? { ...p, dyes: p.dyes.filter((_, i) => i !== idx).map((d, i) => ({ ...d, area: `부위${i + 1}` })) }
      : p)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const next: Record<string, string> = {};
    if (!className) next.className = '직업을 골라 주세요.';
    if (shots.length === 0) next.image = '캡쳐 이미지를 1장 이상 올려 주세요.';
    const badHex = pieces.some((p) => p.dyes.some((d) =>
      (d.base.trim() && !normalizeHex(d.base)) || (d.pattern.trim() && !normalizeHex(d.pattern))));
    if (badHex) next.pieces = '색 코드는 6자리(예: FFFFFF)로 넣어 주세요.';
    setErrors(next);
    if (Object.keys(next).length > 0 || shots.length === 0) return;

    setSubmitting(true);
    setError('');
    try {
      const cleaned = cleanPieces(pieces.map((p) => ({
        part: p.part, name: p.name, grade: p.grade, isInner: p.isInner, icon: p.icon, dyes: p.dyes,
      })));
      const { uploadAvatarImage, deleteAvatarImage } = await import('@/lib/avatar-image');
      // 대표를 맨 앞으로 — images[0] 이 썸네일이고 image 필드에도 같이 둔다
      const ordered = [...shots].sort((a, b) => Number(b.id === coverId) - Number(a.id === coverId));
      const images: StoredImage[] = [];
      try {
        // 한 장씩 올린다 — 동시에 여러 장이면 느린 회선에서 전부 같이 늦어진다
        for (let i = 0; i < ordered.length; i++) {
          setProgress(`사진 올리는 중 ${i + 1}/${ordered.length}`);
          // 대표(맨 앞)만 썸네일을 틀대로 자른다 — 원본은 전체 그대로
          const crop = i === 0 ? crops[ordered[i].id] : undefined;
          images.push(await uploadAvatarImage(ordered[i].file, `avatarLooks/${postId}/${uid}`, crop));
        }
      } catch (err) {
        await Promise.all(images.map((img) => deleteAvatarImage(img)));
        throw err;
      }
      setProgress('저장 중');
      const data: Omit<AvatarLook, 'id' | 'createdAt'> = {
        authorUid: uid,
        authorName,
        className,
        image: images[0],
        images,
        pieces: cleaned,
        source,
      };
      const { createAvatarLook } = await import('@/lib/avatar-look-service');
      let id: string;
      try {
        id = await createAvatarLook(postId, data);
      } catch (err) {
        // 글 저장이 막히면 방금 올린 이미지를 치운다
        await Promise.all(images.map((img) => deleteAvatarImage(img)));
        throw err;
      }
      onCreated({ ...data, id, createdAt: new Date().toISOString() });
    } catch (err) {
      console.error('착장 등록 실패:', err);
      setError(err instanceof Error && err.message ? err.message : '등록에 실패했습니다. 다시 시도해 주세요.');
      setProgress(null);
      setSubmitting(false);
    }
  };

  return (
    <form className={av.lookForm} onSubmit={handleSubmit}>
      <div className={av.lookFormHead}>
        <h3 className={av.lookFormTitle}>내 착장 등록</h3>
        <button type="button" className={av.textBtn} onClick={onCancel}>닫기</button>
      </div>

      {/* 1. 직업 */}
      <div className={av.lookFormBlock}>
        <span className={av.lookFormLabel}>직업 *</span>
        <select
          className={`${av.select} ${errors.className ? av.inputBad : ''}`}
          value={className}
          onChange={(e) => setClassName(e.target.value)}
          aria-label="직업"
        >
          <option value="">직업 선택</option>
          {CLASS_GROUPS.map((g) => (
            <optgroup key={g.label} label={g.label}>
              {g.classes.map((c) => <option key={c} value={c}>{c}</option>)}
            </optgroup>
          ))}
        </select>
        {errors.className && <p className={av.fieldError}>{errors.className}</p>}
      </div>

      {/* 2. 캡쳐 — 여러 장, 대표 1장이 갤러리 썸네일 */}
      <div className={av.lookFormBlock}>
        <span className={av.lookFormLabel}>
          캡쳐 이미지 * <small className={av.labelNote}>최대 {MAX_LOOK_IMAGES}장 · 대표 사진이 목록에 보입니다</small>
        </span>
        {shots.length > 0 && (
          <div className={av.shotGrid}>
            {shots.map((s) => {
              const isCover = s.id === coverId;
              return (
                <div key={s.id} className={`${av.shot} ${isCover ? av.shotCover : ''}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.url} alt="" className={av.shotImg} />
                  <button type="button" className={`${av.shotCoverBtn} ${isCover ? av.shotCoverBtnOn : ''}`}
                    onClick={() => setCoverId(s.id)} aria-pressed={isCover}>
                    {isCover ? '대표' : '대표로'}
                  </button>
                  <button type="button" className={av.shotRemove} onClick={() => removeShot(s.id)}
                    aria-label="이 사진 빼기" title="빼기">×</button>
                </div>
              );
            })}
          </div>
        )}
        {coverShot && (
          <div className={av.cropBlock}>
            <span className={av.lookFormLabel}>
              대표 사진 맞추기 <small className={av.labelNote}>틀을 끌어 옮기고 크기를 조절하세요 · 목록에는 틀 안만 보입니다</small>
            </span>
            <CoverCropper
              url={coverShot.url}
              value={crops[coverShot.id] ?? null}
              onChange={(c) => setCrops((prev) => ({ ...prev, [coverShot.id]: c }))}
            />
          </div>
        )}
        {shots.length < MAX_LOOK_IMAGES && (
          <button
            type="button"
            className={`${av.dropZone} ${shots.length > 0 ? av.dropZoneMini : av.dropZoneSmall} ${errors.image ? av.dropZoneError : ''}`}
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); addFiles(e.dataTransfer.files); }}
          >
            <span className={av.dropHint}>
              {shots.length > 0 ? '+ 사진 추가' : '눌러서 이미지 선택 (여러 장 가능)'}
              <small>끌어다 놓기 · Ctrl+V 붙여넣기도 됩니다</small>
            </span>
          </button>
        )}
        <input ref={fileRef} type="file" accept="image/*" multiple hidden
          onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
        {errors.image && <p className={av.fieldError}>{errors.image}</p>}
      </div>

      {/* 3. 아바타 정보 */}
      <div className={av.lookFormBlock}>
        <span className={av.lookFormLabel}>착용 아바타 · 염색 (선택)</span>
        <div className={av.apiRow}>
          <input
            type="text"
            className={av.textInput}
            value={charName}
            onChange={(e) => setCharName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loadFromApi(); } }}
            placeholder="캐릭터명"
            maxLength={20}
            aria-label="캐릭터명"
          />
          <button type="button" className={av.secondaryBtn} onClick={loadFromApi} disabled={apiLoading || !charName.trim()}>
            {apiLoading ? '불러오는 중...' : '불러오기'}
          </button>
        </div>
        <p className={av.formNote}>
          {apiMsg ?? '캐릭터명으로 착용 아바타와 염색을 불러옵니다. 게임에서 방금 바꿨다면 반영이 늦을 수 있어요 — 그때는 아래에 직접 입력하세요.'}
        </p>

        <div className={`${av.loadedLayout} ${charImage ? '' : av.loadedLayoutNoChar}`}>
          {/* 불러온 캐릭터 — 확인용으로 작게. 아바타 정보가 주인공이다 */}
          {charImage && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={charImage} alt="불러온 캐릭터" className={av.charImage} />
          )}
          <div className={av.pieceGrid}>
            {pieces.map((p) => (
              <div key={p.key} className={av.pieceEditor}>
                <div className={av.pieceEditorRow}>
                  {p.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.icon} alt="" className={av.pieceIcon} loading="lazy" />
                  ) : (
                    <span className={av.pieceIconEmpty} aria-hidden="true" />
                  )}
                  <div className={av.pieceEditorFields}>
                    <select
                      className={av.select}
                      value={(AVATAR_PARTS as readonly string[]).includes(p.part) ? p.part : '기타'}
                      onChange={(e) => updatePiece(p.key, { part: e.target.value })}
                      aria-label="부위"
                    >
                      {AVATAR_PARTS.map((part) => <option key={part} value={part}>{part}</option>)}
                    </select>
                    <input
                      type="text"
                      className={av.textInput}
                      value={p.name}
                      onChange={(e) => updatePiece(p.key, { name: e.target.value })}
                      placeholder="아바타 이름"
                      maxLength={60}
                      aria-label="아바타 이름"
                    />
                  </div>
                  <button type="button" className={av.iconBtn} onClick={() => setPieces((prev) => prev.filter((x) => x.key !== p.key))}
                    aria-label="이 아바타 지우기" title="지우기">×</button>
                </div>
                {p.dyes.map((d, i) => (
                  <div key={i} className={av.dyeEditorRow}>
                    <span className={av.dyeArea}>{d.area}</span>
                    <HexInput value={d.base} onChange={(v) => updateDye(p.key, i, { base: v })} label={`${d.area} 기본색`} />
                    <HexInput value={d.pattern} onChange={(v) => updateDye(p.key, i, { pattern: v })} label={`${d.area} 무늬색`} />
                    <input
                      type="text"
                      className={`${av.textInput} ${av.glossInput}`}
                      value={d.gloss}
                      onChange={(e) => updateDye(p.key, i, { gloss: e.target.value })}
                      placeholder="광택"
                      maxLength={10}
                      aria-label={`${d.area} 광택`}
                    />
                    <button type="button" className={av.iconBtnSmall} onClick={() => removeDye(p.key, i)}
                      aria-label={`${d.area} 지우기`} title="지우기">×</button>
                  </div>
                ))}
                {p.dyes.length > 0 && <span className={av.dyeLegend}>기본색 · 무늬색 · 광택</span>}
                {p.dyes.length < MAX_DYE_AREAS && (
                  <button type="button" className={av.textBtn} onClick={() => addDye(p.key)}>+ 염색 부위</button>
                )}
              </div>
            ))}
          </div>
        </div>
        <button type="button" className={av.textBtn} onClick={() => setPieces((prev) => [...prev, emptyPiece()])}>
          + 아바타 직접 추가
        </button>
        {errors.pieces && <p className={av.fieldError}>{errors.pieces}</p>}
      </div>

      {error && <p className={av.fieldError}>{error}</p>}
      <button type="submit" className={av.primaryBtn} disabled={submitting}>
        {submitting ? (progress ?? '올리는 중...') : '등록하기'}
      </button>
    </form>
  );
}
