import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

import TemplateMappingSummary from './TemplateMappingSummary';
import TemplateNotesDialog from '../TemplateNotesDialog';

const baseReport = {
    chain_id: 'A',
    anchors: 12,
    summary: { constrained: 3, unresolved: 1 },
    positions: [
        { index: 0, resid: 10, icode: '', resname: 'ALA', status: 'constrained', issues: [] },
        { index: 1, resid: 11, icode: '', resname: 'GLY', status: 'unresolved', issues: [{ code: 'unresolved', severity: 'info', message: 'free' }] },
    ],
};

describe('TemplateMappingSummary', () => {
    afterEach(() => cleanup());

    it('shows an OK marker when there is nothing to fix', () => {
        render(<TemplateMappingSummary report={baseReport} />);
        expect(screen.queryByLabelText('template mapping issues')).toBeNull();
        expect(screen.getByTestId('CheckCircleOutlineIcon')).toBeInTheDocument();
    });

    it('lists issues and masks a position on request', () => {
        const report = {
            ...baseReport,
            positions: [
                ...baseReport.positions,
                {
                    index: 2, resid: 12, icode: 'A', resname: 'HIS', status: 'constrained',
                    issues: [{ code: 'chirality_mismatch', severity: 'warning', message: 'Template HIS12A is L but the designed residue is D' }],
                },
            ],
        };
        const onMask = vi.fn();
        render(<TemplateMappingSummary report={report} onMaskPosition={onMask} />);

        const button = screen.getByLabelText('template mapping issues');
        expect(button).toHaveTextContent('1');
        fireEvent.click(button);

        expect(screen.getByText(/designed residue is D/)).toBeInTheDocument();
        expect(screen.queryByText('free')).toBeNull(); // info-level notes are not listed as issues
        fireEvent.click(screen.getByRole('button', { name: 'Mask HIS12A' }));
        expect(onMask).toHaveBeenCalledWith(2);
    });

    it('reports loading and unavailable checks', () => {
        const { rerender } = render(<TemplateMappingSummary report={null} loading />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        rerender(<TemplateMappingSummary report={null} error="boom" />);
        expect(screen.getByTestId('HelpOutlineIcon')).toBeInTheDocument();
    });
});

describe('TemplateNotesDialog', () => {
    afterEach(() => cleanup());

    it('renders string and structured notes with custom actions', () => {
        render(
            <TemplateNotesDialog
                open
                title="Template report"
                items={['Chain A: 2 unresolved residue(s)', { severity: 'info', message: 'Converted from mmCIF' }]}
                actions={<button type="button">Mask and generate</button>}
            />,
        );
        expect(screen.getByText('Template report')).toBeInTheDocument();
        expect(screen.getByText('Chain A: 2 unresolved residue(s)')).toBeInTheDocument();
        expect(screen.getByText('Converted from mmCIF')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Mask and generate' })).toBeInTheDocument();
    });
});
