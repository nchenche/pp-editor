import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import { useBilnHandlers } from '../useBilnHandlers';
import { monomersMock } from '../../../test/mocks/monomers.mock';
import { ConfirmProvider } from '../../components/common/ConfirmDialogProvider';

function renderWithConfirm(ui) {
    return render(<ConfirmProvider>{ui}</ConfirmProvider>);
}

function Harness({ initialBiln = '', uiInitial = { activeSeqIdx: null, seqNumber: 0 } }) {
    const [bilnValue, setBilnValue] = useState(initialBiln);
    const [uiState, setUiState] = useState(uiInitial);

    const handlers = useBilnHandlers({
        bilnValue,
        setBilnValue,
        monomers: monomersMock(bilnValue), // mock that aligns res-idx with biln
        rowMonomerLists: [],
        setRowMonomerLists: () => { },
        linkMap: {},
        uiState,
        setUiState,
        setIsDragging: () => { },
        setHoveredMonomer: () => { },
    });

    // Expose imperative actions via buttons for testing
    return (
        <div>
            <div data-testid="biln">{bilnValue}</div>
            <div data-testid="seq">{String(uiState.activeSeqIdx)}</div>
            <button onClick={() => handlers.addMonomerToBiln({ symbol: 'A' }, { mode: 'new-sequence' })}>add-new-seq</button>
            <button onClick={() => handlers.addMonomerToBiln({ symbol: 'B' }, { mode: 'append', activeSequenceIdx: 0 })}>append-0</button>
            <button onClick={() => handlers.addMonomerToBiln({ symbol: 'B' }, { mode: 'append', activeSequenceIdx: 1 })}>append-1</button>
            <button onClick={() => handlers.addMonomerToBiln({ symbol: 'C' }, { mode: 'prepend', activeSequenceIdx: 0 })}>prepend-0</button>
        </div>
    );
}

function BondBreakHarness({ initialBiln, linkMap, residues, rgroups }) {
    const [bilnValue, setBilnValue] = useState(initialBiln);
    const [uiState, setUiState] = useState({ activeSeqIdx: 0, seqNumber: 1 });

    const handlers = useBilnHandlers({
        bilnValue,
        setBilnValue,
        monomers: monomersMock(bilnValue),
        rowMonomerLists: [],
        setRowMonomerLists: () => { },
        linkMap,
        uiState,
        setUiState,
        setIsDragging: () => { },
        setHoveredMonomer: () => { },
    });

    return (
        <div>
            <div data-testid="biln">{bilnValue}</div>
            <button onClick={() => handlers.handleBondBreaking(residues, rgroups)}>break</button>
        </div>
    );
}

describe('useBilnHandlers.addMonomerToBiln', () => {
    it('creates first sequence and focuses it', () => {
        const { getByTestId, getByText } = renderWithConfirm(<Harness />);
        fireEvent.click(getByText('add-new-seq'));
        expect(getByTestId('biln').textContent).toBe('A');
        expect(getByTestId('seq').textContent).toBe('0');
    });

    it('appends to selected sequence', () => {
        const { getByTestId, getByText } = renderWithConfirm(<Harness initialBiln="A" uiInitial={{ activeSeqIdx: 0, seqNumber: 1 }} />);
        fireEvent.click(getByText('append-0'));
        expect(getByTestId('biln').textContent).toBe('A-B');
    });

    it('prepends to selected sequence', () => {
        const { getByTestId, getByText } = renderWithConfirm(<Harness initialBiln="A-B" uiInitial={{ activeSeqIdx: 0, seqNumber: 1 }} />);
        fireEvent.click(getByText('prepend-0'));
        expect(getByTestId('biln').textContent).toBe('C-A-B');
    });

    it('appends to a placeholder chain by creating a new BILN segment', () => {
        const { getByTestId, getByText } = renderWithConfirm(
            <Harness initialBiln="A" uiInitial={{ activeSeqIdx: 1, seqNumber: 2 }} />
        );
        fireEvent.click(getByText('append-1'));
        expect(getByTestId('biln').textContent).toBe('A.B');
        expect(getByTestId('seq').textContent).toBe('1');
    });
});

describe('useBilnHandlers.handleBondBreaking', () => {
    it('breaks a bond even when rgroups order is swapped', () => {
        // Connection 1 connects residue 0 rgroup 2 with residue 1 rgroup 1
        const initialBiln = 'A(1,2)-B(1,1)';
        const linkMap = {
            1: [
                { monomerIdx: 0, rgroup: 2 },
                { monomerIdx: 1, rgroup: 1 },
            ],
        };

        const { getByTestId, getByText } = renderWithConfirm(
            <BondBreakHarness
                initialBiln={initialBiln}
                linkMap={linkMap}
                residues={[0, 1]}
                rgroups={[1, 2]}
            />
        );

        fireEvent.click(getByText('break'));
        expect(getByTestId('biln').textContent).toBe('A-B');
    });
});