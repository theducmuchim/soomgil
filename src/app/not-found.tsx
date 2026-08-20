import { PageHeading } from '@/components/layout/PageHeading';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <>
      <PageHeading
        eyebrow="404"
        title="찾을 수 없는 페이지입니다"
        description="주소가 바뀌었거나 삭제된 페이지일 수 있습니다."
      />
      <Container>
        <div className="my-12 flex flex-col gap-3 sm:flex-row">
          <Button href="/" variant="secondary" size="lg">
            홈으로
          </Button>
          <Button href="/route" size="lg">
            지금 경로 찾기
          </Button>
        </div>
      </Container>
    </>
  );
}
