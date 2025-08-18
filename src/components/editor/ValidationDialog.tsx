import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { BadgeCheck, Lightbulb, TriangleAlert, XCircle, ChevronDown } from 'lucide-react';
import { useMemo, useState, useRef, useEffect } from 'react';
import { ValidationError, ValidationResult, generateValidationReport } from '@/lib/validation';
import { toast } from 'react-hot-toast';

interface ValidationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTable?: (tableId: string) => void;
  validationResults?: ValidationResult;
}

interface CollapsibleSectionProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  colorScheme: 'red' | 'yellow' | 'blue';
}

function CollapsibleSection({
  title,
  count,
  icon,
  isExpanded,
  onToggle,
  children,
  colorScheme
}: CollapsibleSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (contentRef.current) {
      const scrollHeight = contentRef.current.scrollHeight + 10;
      setHeight(isExpanded ? scrollHeight : 0);
    }
  }, [isExpanded, children]);

  const colorClasses = {
    red: {
      icon: 'text-red-400',
      button: 'hover:bg-red-900/10',
      content: 'bg-red-900/20 border-red-800/50 '
    },
    yellow: {
      icon: 'text-yellow-400',
      button: 'hover:bg-yellow-900/10',
      content: 'bg-yellow-900/20 border-yellow-800/50'
    },
    blue: {
      icon: 'text-blue-400',
      button: 'hover:bg-blue-900/10',
      content: 'bg-blue-900/20 border-blue-800/50'
    }
  };

  return (
    <div className="mb-6">
      <button
        className={`flex items-center justify-between w-full text-left p-3 rounded-lg transition-all duration-200 ${colorClasses[colorScheme].button}`}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-lg font-medium">{title} ({count})</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 transition-transform duration-300 ease-out ${isExpanded ? 'rotate-180' : 'rotate-0'
            }`}
        />
      </button>

      <div
        className="overflow-hidden transition-all duration-300 ease-out"
        style={{ height: `${height}px` }}
      >
        <div ref={contentRef} className="ml-2 mt-2">
          {children}
        </div>
      </div>
    </div>
  );
}

export function ValidationDialog({
  isOpen,
  onClose,
  onSelectTable,
  validationResults
}: ValidationDialogProps) {
  const [expandedSections, setExpandedSections] = useState({
    errors: false,
    warnings: false,
    suggestions: false
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Process validation results
  const processedResults = useMemo(() => {
    if (!validationResults) return { errors: [], warnings: [], suggestions: [] };

    const errors = validationResults.errors.filter(e => e.severity === 'error');
    const warnings = validationResults.errors.filter(e => e.severity === 'warning');

    return { errors, warnings, suggestions: [] as ValidationError[] };
  }, [validationResults]);

  const handleExportReport = () => {
    if (!validationResults) return;

    const report = generateValidationReport(validationResults);
    const blob = new Blob([report], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'validation-report.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success('Validation report exported successfully!');
  };

  const handleItemClick = (nodeId?: string) => {
    if (nodeId && onSelectTable) {
      onSelectTable(nodeId);
    }
  };

  const renderValidationItems = (items: ValidationError[], colorScheme: 'red' | 'yellow' | 'blue') => {
    const colorClasses = {
      red: {
        bg: 'bg-red-900/20',
        border: 'border-red-800/50',
        hover: 'hover:bg-red-900/30',
        icon: 'text-red-400',
        text: 'text-red-300'
      },
      yellow: {
        bg: 'bg-yellow-900/20',
        border: 'border-yellow-800/50',
        hover: 'hover:bg-yellow-900/30',
        icon: 'text-yellow-400',
        text: 'text-yellow-300'
      },
      blue: {
        bg: 'bg-blue-900/20',
        border: 'border-blue-800/50',
        hover: 'hover:bg-blue-900/30',
        icon: 'text-blue-400',
        text: 'text-blue-300'
      }
    };

    const colors = colorClasses[colorScheme];
    const IconComponent = colorScheme === 'red' ? XCircle :
      colorScheme === 'yellow' ? TriangleAlert : Lightbulb;

    if (items.length === 0) {
      const emptyMessage = colorScheme === 'red' ? 'No errors found. Great work!' :
        colorScheme === 'yellow' ? 'No warnings found' :
          'No suggestions at this time';

      return (
        <div className="text-sm text-zinc-500 p-3 bg-zinc-900/50 rounded-lg transition-all duration-200">
          {emptyMessage}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className={`text-sm p-3 border rounded-lg cursor-pointer ${colors.bg} ${colors.border} ${colors.hover}`}
            onClick={() => handleItemClick(item.nodeId)}
          >
            <div className="flex items-start gap-3">
              <IconComponent className={`w-5 h-5 mt-0.5 flex-shrink-0 ${colors.icon}`} />
              <div className="flex-1">
                <div className="leading-relaxed">{item.message}</div>
                {item.nodeId && (
                  <div className={`text-xs mt-2 ${colors.text}`}>
                    Table ID: {item.nodeId}
                    {item.fieldIndex !== undefined ? `, Field: ${item.fieldIndex + 1}` : ''}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BadgeCheck className="h-5 w-5 text-blue-400" />
              Schema Validation
            </DialogTitle>
            <DialogDescription>
              Review issues and suggestions for your database schema
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
            {validationResults ? (
              <>
                {/* Summary with staggered animation */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    {
                      count: processedResults.errors.length,
                      label: 'Errors',
                      icon: XCircle,
                      color: 'red',
                      delay: '0ms'
                    },
                    {
                      count: processedResults.warnings.length,
                      label: 'Warnings',
                      icon: TriangleAlert,
                      color: 'yellow',
                      delay: '100ms'
                    },
                    {
                      count: processedResults.suggestions.length,
                      label: 'Suggestions',
                      icon: Lightbulb,
                      color: 'blue',
                      delay: '200ms'
                    }
                  ].map((item) => {
                    const colorClasses = {
                      red: 'bg-red-900/30 border-red-800 text-red-400',
                      yellow: 'bg-yellow-900/30 border-yellow-800 text-yellow-400',
                      blue: 'bg-blue-900/30 border-blue-800 text-blue-400'
                    };

                    return (
                      <div
                        key={item.label}
                        className={`border rounded p-4 text-center transition-all duration-300  ${colorClasses[item.color as keyof typeof colorClasses]}`}
                      >
                        <item.icon className="w-6 h-6 mx-auto" />
                        <div className="text-lg mt-2 font-medium transition-all duration-200">
                          {item.count}
                        </div>
                        <div className="text-sm opacity-80">{item.label}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex-1 overflow-auto pr-2">
                  {/* Errors Section */}
                  <CollapsibleSection
                    title="Errors"
                    count={processedResults.errors.length}
                    icon={<XCircle className="w-5 h-5 text-red-400" />}
                    isExpanded={expandedSections.errors}
                    onToggle={() => toggleSection('errors')}
                    colorScheme="red"
                  >
                    {renderValidationItems(processedResults.errors, 'red')}
                  </CollapsibleSection>

                  {/* Warnings Section */}
                  <CollapsibleSection
                    title="Warnings"
                    count={processedResults.warnings.length}
                    icon={<TriangleAlert className="w-5 h-5 text-yellow-400" />}
                    isExpanded={expandedSections.warnings}
                    onToggle={() => toggleSection('warnings')}
                    colorScheme="yellow"
                  >
                    {renderValidationItems(processedResults.warnings, 'yellow')}
                  </CollapsibleSection>

                  {/* Suggestions Section */}
                  <CollapsibleSection
                    title="Suggestions"
                    count={processedResults.suggestions.length}
                    icon={<Lightbulb className="w-5 h-5 text-blue-400" />}
                    isExpanded={expandedSections.suggestions}
                    onToggle={() => toggleSection('suggestions')}
                    colorScheme="blue"
                  >
                    {renderValidationItems(processedResults.suggestions, 'blue')}
                  </CollapsibleSection>
                </div>

                <div className="mt-6 flex justify-end">
                  <Button
                    variant="secondary"
                    onClick={handleExportReport}
                    className="transition-all duration-200 "
                  >
                    Export Report
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <BadgeCheck className="w-12 h-12 mx-auto text-zinc-500 mb-4 transition-all duration-300" />
                  <p className="text-zinc-500">Run validation to check your schema</p>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}