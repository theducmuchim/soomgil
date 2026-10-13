import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    /*
     * Next 16 부터 images.qualities 기본값이 [75] 하나로 좁아졌다.
     * 목록에 없는 quality 는 에러가 아니라 가장 가까운 값으로 조용히 내려앉는다.
     * 히어로 사진이 quality={90} 을 쓰므로 여기에 90 을 열어 둔다.
     * (열어 두지 않으면 90 이 75 로 바뀌어, 큰 화면에서 야경의 어두운 계조가 뭉갠다)
     */
    qualities: [75, 90],
  },
};

export default nextConfig;
