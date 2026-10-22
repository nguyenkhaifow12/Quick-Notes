import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { BookOpen, FileText, Pin, Plus, Search, Sparkles, Pencil, Trash2, X } from 'lucide-react';
import {
  Route,
  Switch,
  useLocation,
  Router as WouterRouter,
} from 'wouter';

const queryClient = new QueryClient();

type Note = {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  pinned: boolean;
};

const STORAGE_KEY = 'ghi-chu-notes-v1';
const cardColors = [
  { bg: '#fcf8ee', accent: '#d79d62' },
  { bg: '#f4f7ef', accent: '#79a180' },
  { bg: '#fbf1eb', accent: '#d48468' },
  { bg: '#f0f5f4', accent: '#7b9f9a' },
  { bg: '#f7f2f8', accent: '#a589b1' },
];

function readNotes(): Note[] {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return [];
    const parsed: unknown = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed.filter((item): item is Note =>
      item && typeof item.id === 'string' && typeof item.title === 'string' &&
      typeof item.content === 'string' && typeof item.updatedAt === 'string' &&
      typeof item.createdAt === 'string' && typeof item.pinned === 'boolean'
    ) : [];
  } catch {
    return [];
  }
}

function Home() {
  const [notes, setNotes] = useState<Note[]>(readNotes);
  const [filter, setFilter] = useState<'all' | 'pinned'>('all');
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState<Note | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftPinned, setDraftPinned] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
    } catch {
      setToast('Không thể lưu ghi chú trên thiết bị này.');
    }
  }, [notes]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  function closeEditor() {
    setEditor(null);
    setIsCreating(false);
  }

  function saveNote() {
    const title = draftTitle.trim() || draftContent.trim().split('\n')[0]?.slice(0, 48) || 'Ghi chú mới';
    const now = new Date().toISOString();
    if (editor) {
      setNotes((current) => current.map((note) => note.id === editor.id
        ? { ...note, title, content: draftContent.trim(), pinned: draftPinned, updatedAt: now }
        : note));
      setToast('Đã lưu thay đổi.');
    } else {
      setNotes((current) => [{ id: crypto.randomUUID(), title, content: draftContent.trim(), createdAt: now, updatedAt: now, pinned: draftPinned }, ...current]);
      setToast('Đã cất vào sổ tay.');
    }
    closeEditor();
  }

  useEffect(() => {
    if (!isCreating && !editor) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeEditor();
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') saveNote();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  const pinnedCount = notes.filter((note) => note.pinned).length;
  const visibleNotes = useMemo(() => {
    const normalized = search.trim().toLocaleLowerCase('vi');
    return notes
      .filter((note) => filter === 'all' || note.pinned)
      .filter((note) => !normalized || `${note.title} ${note.content}`.toLocaleLowerCase('vi').includes(normalized))
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
  }, [notes, filter, search]);

  function openCreate() {
    setEditor(null);
    setDraftTitle('');
    setDraftContent('');
    setDraftPinned(false);
    setIsCreating(true);
  }

  function openEdit(note: Note) {
    setEditor(note);
    setDraftTitle(note.title);
    setDraftContent(note.content);
    setDraftPinned(note.pinned);
    setIsCreating(false);
  }

  function togglePin(note: Note) {
    setNotes((current) => current.map((item) => item.id === note.id
      ? { ...item, pinned: !item.pinned, updatedAt: new Date().toISOString() }
      : item));
    setToast(note.pinned ? 'Đã bỏ ghim ghi chú.' : 'Đã ghim lên đầu sổ.');
  }

  function deleteNote(note: Note) {
    if (!window.confirm(`Bạn muốn xóa “${note.title}”? Ghi chú này sẽ không thể khôi phục.`)) return;
    setNotes((current) => current.filter((item) => item.id !== note.id));
    setToast('Đã xóa ghi chú.');
  }

  function formatDate(value: string) {
    return new Intl.DateTimeFormat('vi-VN', { day: 'numeric', month: 'short' }).format(new Date(value));
  }

  return (
    <div className="app-shell" data-testid="app-notes">
      <aside className="sidebar" aria-label="Điều hướng sổ tay">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true"><BookOpen size={19} strokeWidth={1.8} /></div>
          <div><div className="brand-name">ghi chú</div><div className="brand-sub">sổ tay của riêng bạn</div></div>
        </div>
        <div className="side-label">Góc nhỏ của bạn</div>
        <nav className="side-nav" aria-label="Lọc ghi chú">
          <button className={`nav-item ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')} data-testid="filter-all">
            <FileText size={16} /> Tất cả ghi chú <span className="nav-count" data-testid="count-all">{notes.length}</span>
          </button>
          <button className={`nav-item ${filter === 'pinned' ? 'active' : ''}`} onClick={() => setFilter('pinned')} data-testid="filter-pinned">
            <Pin size={16} /> Đã ghim <span className="nav-count" data-testid="count-pinned">{pinnedCount}</span>
          </button>
        </nav>
        <div className="sidebar-spacer" />
        <div className="side-note"><strong>Một góc để nhớ.</strong><p>Ý nghĩ nhỏ cũng xứng đáng có một nơi để ở lại.</p></div>
        <div className="side-footer">Riêng tư trên thiết bị của bạn</div>
      </aside>

      <main className="main-area">
        <div className="main-inner">
          <div className="topline">
            <span className="eyebrow">Không gian của riêng bạn</span>
            <span className="today-date" data-testid="text-today">{new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}</span>
          </div>
          <section className="intro">
            <div><div className="eyebrow">Chào bạn,</div><h1>Những điều<br />đáng để nhớ.</h1><p>Viết xuống khi chúng vừa ghé qua.</p></div>
            <button className="create-button" onClick={openCreate} data-testid="button-create-note"><Plus size={17} strokeWidth={2.2} /> Ghi điều mới</button>
          </section>

          <section aria-label="Danh sách ghi chú">
            <div className="toolbar">
              <div className="section-label" data-testid="text-list-heading">
                {filter === 'pinned' ? 'Đã ghim' : search ? 'Kết quả tìm kiếm' : 'Sổ tay của bạn'}
                <span className="result-count" data-testid="text-result-count">{visibleNotes.length}</span>
              </div>
              <label className="search-wrap">
                <Search className="search-icon" size={16} />
                <input className="search-input" type="search" placeholder="Tìm trong ghi chú..." value={search}
                  onChange={(event) => setSearch(event.target.value)} aria-label="Tìm ghi chú" data-testid="input-search-notes" />
              </label>
            </div>
            <div className="notes-grid" data-testid="notes-list">
              {visibleNotes.map((note, index) => {
                const color = cardColors[index % cardColors.length];
                return (
                  <article className="note-card" key={note.id} style={{ '--note-bg': color.bg, '--note-accent': color.accent } as CSSProperties}
                    onDoubleClick={() => openEdit(note)} data-testid={`card-note-${note.id}`}>
                    <div className="note-card-head">
                      <h2 data-testid={`text-note-title-${note.id}`}>{note.title}</h2>
                      {note.pinned && <Pin size={15} className="pin-indicator" fill="currentColor" aria-label="Đã ghim" />}
                    </div>
                    <div className="note-content" data-testid={`text-note-content-${note.id}`}>{note.content || 'Chưa có nội dung.'}</div>
                    <div className="note-meta">
                      <span data-testid={`text-note-date-${note.id}`}>Cập nhật {formatDate(note.updatedAt)}</span>
                      <div className="card-actions">
                        <button className="icon-button" aria-label={note.pinned ? 'Bỏ ghim' : 'Ghim ghi chú'} title={note.pinned ? 'Bỏ ghim' : 'Ghim'}
                          onClick={() => togglePin(note)} data-testid={`button-pin-note-${note.id}`}><Pin size={14} fill={note.pinned ? 'currentColor' : 'none'} /></button>
                        <button className="icon-button" aria-label="Sửa ghi chú" title="Sửa" onClick={() => openEdit(note)} data-testid={`button-edit-note-${note.id}`}><Pencil size={14} /></button>
                        <button className="icon-button delete" aria-label="Xóa ghi chú" title="Xóa" onClick={() => deleteNote(note)} data-testid={`button-delete-note-${note.id}`}><Trash2 size={14} /></button>
                      </div>
                    </div>
                  </article>
                );
              })}
              {visibleNotes.length === 0 && (
                <div className="empty-state" data-testid="empty-state">
                  <div className="empty-illustration" aria-hidden="true">
                    {search ? <Search size={27} strokeWidth={1.5} /> : filter === 'pinned' ? <Pin size={27} strokeWidth={1.5} /> : <Sparkles size={27} strokeWidth={1.5} />}
                  </div>
                  <h2>{search ? 'Chưa tìm thấy điều này' : filter === 'pinned' ? 'Chưa có gì được ghim' : 'Trang đầu tiên còn thơm mùi giấy'}</h2>
                  <p>{search ? `Không có ghi chú nào khớp với “${search}”. Thử một từ khóa khác nhé.` : filter === 'pinned' ? 'Ghim những điều bạn muốn tìm lại thật nhanh. Chúng sẽ luôn nằm ở đầu sổ.' : 'Một ý tưởng, một câu nói hay, hay việc cần nhớ — cứ bắt đầu bằng một dòng.'}</p>
                  {!search && filter === 'all' && <button className="empty-cta" onClick={openCreate} data-testid="button-empty-create">Viết ghi chú đầu tiên <span aria-hidden="true">→</span></button>}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {(isCreating || editor) && (
        <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeEditor(); }} data-testid="dialog-note-editor">
          <section className="editor" role="dialog" aria-modal="true" aria-labelledby="editor-title-label">
            <div className="editor-top">
              <span className="editor-kicker">{editor ? 'Mở lại một ý nghĩ' : 'Một trang mới'}</span>
              <button className="close-button" aria-label="Đóng" onClick={closeEditor} data-testid="button-close-editor"><X size={18} /></button>
            </div>
            <label className="sr-only" id="editor-title-label" htmlFor="note-title">Tiêu đề ghi chú</label>
            <input id="note-title" className="editor-title" autoFocus value={draftTitle} onChange={(event) => setDraftTitle(event.target.value)} placeholder="Đặt một tiêu đề..." data-testid="input-note-title" />
            <textarea className="editor-body" value={draftContent} onChange={(event) => setDraftContent(event.target.value)} placeholder="Viết điều bạn muốn giữ lại..." data-testid="input-note-content" />
            <div className="editor-bottom">
              <button className={`pin-toggle ${draftPinned ? 'selected' : ''}`} onClick={() => setDraftPinned((value) => !value)} data-testid="button-toggle-pin"><Pin size={15} fill={draftPinned ? 'currentColor' : 'none'} /> {draftPinned ? 'Đang ghim' : 'Ghim ghi chú'}</button>
              <div className="editor-actions">
                <button className="cancel-button" onClick={closeEditor} data-testid="button-cancel-note">Hủy</button>
                <button className="save-button" onClick={saveNote} data-testid="button-save-note">Lưu ghi chú</button>
              </div>
            </div>
          </section>
        </div>
      )}
      {toast && <div className="toast" role="status" data-testid="status-toast">{toast}</div>}
      </div>
  );
}

function Router() {
  return (
    // Keep a shared shell (sidebar, navbar) outside the boundary so it
    // survives a page crash.
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
