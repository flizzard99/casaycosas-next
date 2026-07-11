import { tienda } from '@/lib/config';

export default function FloatWhatsApp() {
  const url = `${tienda.whatsappUrl}?text=${encodeURIComponent(
    'Hola! Quisiera hacer una consulta sobre un producto.'
  )}`;

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escríbenos por WhatsApp"
      className="fixed bottom-5 right-5 z-30 bg-[#25D366] text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
    >
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
        <path d="M.057 24l1.687-6.163a11.867 11.867 0 01-1.687-5.946C.057 5.335 5.391 0 12.06 0a11.82 11.82 0 018.413 3.488 11.82 11.82 0 013.48 8.414c-.003 6.667-5.337 12.001-12.06 12.001a11.94 11.94 0 01-5.748-1.467L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 001.651 5.461l-.999 3.648 3.837-.008z" />
      </svg>
    </a>
  );
}