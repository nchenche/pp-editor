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
            <button onClick={() => handlers.addMonomerToBiln({ symbol: 'C' }, { mode: 'prepend', activeSequenceIdx: 0 })}>prepend-0</button>
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
});