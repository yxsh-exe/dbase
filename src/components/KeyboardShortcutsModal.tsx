import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { KEYBOARD_SHORTCUTS, KeyboardShortcut } from '@/hooks/useKeyboardShortcuts';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function formatShortcutKey(key: string): string {
  return key
    .replace('ctrl', 'Ctrl')
    .replace('shift', '⇧')
    .replace('alt', '⌥')
    .replace('meta', '⌘')
    .replace('+', ' + ')
    .split(' + ')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' + ');
}

function ShortcutRow({ shortcut }: { shortcut: KeyboardShortcut }) {
  return (
    <div className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-zinc-800/50 transition-colors">
      <span className="text-sm text-zinc-300">{shortcut.description}</span>
      <Badge variant="outline" className="font-mono text-xs bg-zinc-800 border-zinc-600 text-zinc-200">
        {formatShortcutKey(shortcut.keys)}
      </Badge>
    </div>
  );
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  // Group shortcuts by category
  const groupedShortcuts = KEYBOARD_SHORTCUTS.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, KeyboardShortcut[]>);

  const categoryOrder = ['General', 'Table Operations', 'Editing', 'Navigation'];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto bg-zinc-900 border-zinc-700 text-zinc-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-semibold">
            <Keyboard className="h-6 w-6 text-blue-400" />
            Keyboard Shortcuts
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <p className="text-sm text-zinc-400">
            Use these keyboard shortcuts to navigate and interact with the schema editor more efficiently.
          </p>
          
          {categoryOrder.map((category) => {
            const shortcuts = groupedShortcuts[category];
            if (!shortcuts || shortcuts.length === 0) return null;
            
            return (
              <div key={category}>
                <h3 className="text-lg font-semibold text-zinc-200 mb-3 flex items-center gap-2">
                  {category === 'General' && '⚙️'}
                  {category === 'Table Operations' && '🗂️'}
                  {category === 'Editing' && '✏️'}
                  {category}
                </h3>
                <div className="space-y-1 bg-zinc-800/30 rounded-lg p-2">
                  {shortcuts.map((shortcut, index) => (
                    <ShortcutRow key={`${category}-${index}`} shortcut={shortcut} />
                  ))}
                </div>
              </div>
            );
          })}
          
          <div className="mt-6 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700">
            <h4 className="text-sm font-semibold text-zinc-300 mb-2">💡 Tips</h4>
            <ul className="text-sm text-zinc-400 space-y-1">
              <li>• Most shortcuts work globally, but some are context-sensitive</li>
              <li>• Press <Badge variant="outline" className="text-xs bg-zinc-700 border-zinc-600 text-zinc-300">Esc</Badge> to close dialogs and cancel operations</li>
              <li>• Use <Badge variant="outline" className="text-xs bg-zinc-700 border-zinc-600 text-zinc-300">Tab</Badge> and <Badge variant="outline" className="text-xs bg-zinc-700 border-zinc-600 text-zinc-300">Enter</Badge> to navigate through form fields</li>
              <li>• Shortcuts are disabled when typing in input fields (except Save)</li>
            </ul>
          </div>
        </div>
        
        <div className="flex justify-end pt-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg transition-colors"
          >
            Got it
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}