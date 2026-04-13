import Link from 'next/link';

export default function NavTabs({ active }: { active: 'live' | 'swipe' }) {
  return (
    <div className="navTabs">
      <Link href="/" className={active === 'live' ? 'tab activeTab' : 'tab'}>
        Live chat
      </Link>
      <Link href="/swipe" className={active === 'swipe' ? 'tab activeTab' : 'tab'}>
        Swipe mode
      </Link>
    </div>
  );
}
