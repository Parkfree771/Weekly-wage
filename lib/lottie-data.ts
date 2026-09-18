// 로티 JSON 을 경로별로 한 번만 받아 여러 인스턴스가 나눠 쓴다.
//
// lottie-web 에 path 를 넘기면 인스턴스마다 XHR 을 따로 보낸다. 갤러리 카드 6장 × (따봉·흠) 처럼
// 같은 파일을 동시에 띄우면 브라우저 캐시가 앉기 전에 요청이 전부 나가버려 12건이 됐다
// (2026-09-18 실측). 여기서 fetch 를 경로당 1회로 합친다.
// 본문은 문자열로 들고 있다가 인스턴스마다 JSON.parse 한다 — lottie-web 이 animationData 를
// 제자리에서 고치기 때문에(__complete 표시 등) 객체 하나를 여럿이 공유하면 안 된다.
const inflight = new Map<string, Promise<string>>();

export function loadLottieData(path: string): Promise<unknown> {
  let p = inflight.get(path);
  if (!p) {
    p = fetch(path).then((res) => {
      if (!res.ok) throw new Error(`lottie ${path}: ${res.status}`);
      return res.text();
    });
    // 실패한 약속을 남겨두면 다음 마운트도 영영 실패한다 — 지워서 다시 받게
    p.catch(() => { inflight.delete(path); });
    inflight.set(path, p);
  }
  return p.then((text) => JSON.parse(text));
}
