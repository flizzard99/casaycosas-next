import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-verde-noche text-crema py-10 px-6 text-center">
      <div className="font-display text-base tracking-wide text-white">
        TIENDA CASA Y COSAS, PANGUIPULLI
        <Link href="/admin" aria-label="Acceso administrador" className="text-[10px] align-super opacity-20 hover:opacity-100 transition-opacity no-underline">
          ®
        </Link>
      </div>
      <div className="mt-2 text-xs text-[#B9C4B4] italic">Powered by Jerson Hernández</div>
    </footer>
  );
}