export function useRouter() { return { refresh() { window.dispatchEvent(new Event('preview-refresh')); } }; }
