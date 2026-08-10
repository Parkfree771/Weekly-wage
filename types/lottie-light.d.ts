// lottie-web 경량 빌드(svg 렌더러 전용) 서브패스 — 패키지가 이 경로에는 타입을 안 실어줘서
// 메인 엔트리 타입을 그대로 물려준다
declare module 'lottie-web/build/player/lottie_light' {
  import lottie from 'lottie-web';
  export default lottie;
}
