import HomeSectionSelector from '@/components/HomeSectionSelector';
import CartDrawer from '@/components/CartDrawer';

export const revalidate = 60;

export default function HomePage() {
  return (
    <div className="shop">
      <HomeSectionSelector />
      <CartDrawer />
    </div>
  );
}
