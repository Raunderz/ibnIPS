// Test hook state machine logic.
// These test the pure state management logic that hooks would use.

type MockModeState = {
  enabled: boolean;
  scenarioId: string | null;
};

type MockModeAction =
  | { type: 'ENABLE'; scenarioId: string }
  | { type: 'DISABLE' }
  | { type: 'SET_SCENARIO'; scenarioId: string };

function mockModeReducer(state: MockModeState, action: MockModeAction): MockModeState {
  switch (action.type) {
    case 'ENABLE':
      return { enabled: true, scenarioId: action.scenarioId };
    case 'DISABLE':
      return { enabled: false, scenarioId: null };
    case 'SET_SCENARIO':
      return { ...state, scenarioId: action.scenarioId };
    default:
      return state;
  }
}

type PositionState = {
  status: 'loading' | 'active' | 'error';
  x: number | null;
  y: number | null;
  floor: number | null;
  confidence: number | null;
  error: string | null;
};

type PositionAction =
  | { type: 'LOADING' }
  | { type: 'POSITION_FOUND'; x: number; y: number; floor: number; confidence: number }
  | { type: 'ERROR'; message: string }
  | { type: 'RESET' };

function positionReducer(state: PositionState, action: PositionAction): PositionState {
  switch (action.type) {
    case 'LOADING':
      return { ...state, status: 'loading', error: null };
    case 'POSITION_FOUND':
      return {
        status: 'active',
        x: action.x,
        y: action.y,
        floor: action.floor,
        confidence: action.confidence,
        error: null,
      };
    case 'ERROR':
      return { ...state, status: 'error', error: action.message };
    case 'RESET':
      return { status: 'loading', x: null, y: null, floor: null, confidence: null, error: null };
    default:
      return state;
  }
}

type ToastState = {
  messages: Array<{ id: string; message: string; variant: string }>;
};

type ToastAction =
  | { type: 'ADD'; id: string; message: string; variant: string }
  | { type: 'REMOVE'; id: string }
  | { type: 'CLEAR' };

function toastReducer(state: ToastState, action: ToastAction): ToastState {
  switch (action.type) {
    case 'ADD':
      return { ...state, messages: [...state.messages, { id: action.id, message: action.message, variant: action.variant }] };
    case 'REMOVE':
      return { ...state, messages: state.messages.filter((m) => m.id !== action.id) };
    case 'CLEAR':
      return { messages: [] };
    default:
      return state;
  }
}

describe('useMockMode logic', () => {
  const initialState: MockModeState = { enabled: false, scenarioId: null };

  it('should start disabled', () => {
    expect(initialState.enabled).toBe(false);
    expect(initialState.scenarioId).toBeNull();
  });

  it('should enable with scenario', () => {
    const next = mockModeReducer(initialState, { type: 'ENABLE', scenarioId: 'lab_201' });
    expect(next.enabled).toBe(true);
    expect(next.scenarioId).toBe('lab_201');
  });

  it('should disable', () => {
    const enabled = mockModeReducer(initialState, { type: 'ENABLE', scenarioId: 'hall_1f' });
    const disabled = mockModeReducer(enabled, { type: 'DISABLE' });
    expect(disabled.enabled).toBe(false);
    expect(disabled.scenarioId).toBeNull();
  });

  it('should change scenario while enabled', () => {
    const state = mockModeReducer(initialState, { type: 'ENABLE', scenarioId: 'lab_201' });
    const next = mockModeReducer(state, { type: 'SET_SCENARIO', scenarioId: 'physics' });
    expect(next.scenarioId).toBe('physics');
    expect(next.enabled).toBe(true);
  });
});

describe('usePosition logic', () => {
  const initialState: PositionState = {
    status: 'loading',
    x: null,
    y: null,
    floor: null,
    confidence: null,
    error: null,
  };

  it('should start in loading state', () => {
    expect(initialState.status).toBe('loading');
    expect(initialState.x).toBeNull();
  });

  it('should transition to active with position', () => {
    const next = positionReducer(initialState, {
      type: 'POSITION_FOUND',
      x: 100,
      y: 200,
      floor: 2,
      confidence: 0.85,
    });
    expect(next.status).toBe('active');
    expect(next.x).toBe(100);
    expect(next.y).toBe(200);
    expect(next.floor).toBe(2);
    expect(next.confidence).toBe(0.85);
    expect(next.error).toBeNull();
  });

  it('should transition to error', () => {
    const next = positionReducer(initialState, { type: 'ERROR', message: 'No networks' });
    expect(next.status).toBe('error');
    expect(next.error).toBe('No networks');
  });

  it('should reset to initial state', () => {
    const found = positionReducer(initialState, {
      type: 'POSITION_FOUND',
      x: 10,
      y: 20,
      floor: 1,
      confidence: 0.9,
    });
    const reset = positionReducer(found, { type: 'RESET' });
    expect(reset.status).toBe('loading');
    expect(reset.x).toBeNull();
  });
});

describe('useToast logic', () => {
  const initialState: ToastState = { messages: [] };

  it('should start with empty messages', () => {
    expect(initialState.messages).toHaveLength(0);
  });

  it('should add a toast', () => {
    const next = toastReducer(initialState, {
      type: 'ADD',
      id: 't1',
      message: 'Saved',
      variant: 'success',
    });
    expect(next.messages).toHaveLength(1);
    expect(next.messages[0].message).toBe('Saved');
  });

  it('should remove a toast by id', () => {
    let state = toastReducer(initialState, { type: 'ADD', id: 't1', message: 'A', variant: 'success' });
    state = toastReducer(state, { type: 'ADD', id: 't2', message: 'B', variant: 'error' });
    state = toastReducer(state, { type: 'REMOVE', id: 't1' });
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].id).toBe('t2');
  });

  it('should clear all toasts', () => {
    let state = toastReducer(initialState, { type: 'ADD', id: 't1', message: 'A', variant: 'success' });
    state = toastReducer(state, { type: 'ADD', id: 't2', message: 'B', variant: 'error' });
    state = toastReducer(state, { type: 'CLEAR' });
    expect(state.messages).toHaveLength(0);
  });
});
