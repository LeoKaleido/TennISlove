import { Logo } from '../components/ui';

// Selfie e gallery arrivano nel rilascio 3 (brain/01-product.md §7)
export function GalleryPage() {
  return (
    <div className="screen">
      <div className="page-head">
        <h1 className="display">Gallery</h1>
        <div className="sub">I selfie delle partite</div>
      </div>
      <div className="center-state" style={{ gap: 14 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Logo size={64} />
          <div style={{ maxWidth: 280, lineHeight: 1.5 }}>Presto potrete caricare i selfie delle partite: ogni foto diventerà la copertina della sua partita.</div>
        </div>
      </div>
    </div>
  );
}
