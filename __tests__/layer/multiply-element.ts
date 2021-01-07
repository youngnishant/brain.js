import { GPU } from 'gpu.js';
import { gpuMock } from 'gpu-mock.js';

import {
  MultiplyElement,
  multiplyElement,
  predict,
  compare,
} from '../../src/layer/multiply-element';
import { setup, teardown } from '../../src/utilities/kernel';
import { injectIstanbulCoverage, mockLayer, mockTexture } from '../test-utils';
import { ILayer } from '../../src/layer/base-layer';

describe('MultiplyElement Layer', () => {
  beforeEach(() => {
    setup(
      new GPU({
        mode: 'cpu',
      })
    );
  });
  afterEach(() => {
    teardown();
  });

  describe('.constructor', () => {
    let mockInputLayer1: ILayer;
    let mockInputLayer2: ILayer;
    let layer: MultiplyElement;
    beforeEach(() => {
      mockInputLayer1 = mockLayer({ width: 3, height: 2 });
      mockInputLayer2 = mockLayer({ width: 3, height: 2 });
      layer = new MultiplyElement(mockInputLayer1, mockInputLayer2);
    });
    test('sets inputLayer1 and inputLayer2', () => {
      expect(layer.inputLayer1).toBe(mockInputLayer1);
      expect(layer.inputLayer2).toBe(mockInputLayer2);
    });
    test('gets its dimensions from the first inputLayer', () => {
      expect(layer.width).toBe(mockInputLayer1.width);
      expect(layer.height).toBe(mockInputLayer1.height);
    });
    test('throws if widths are mismatched', () => {
      mockInputLayer1 = mockLayer({ width: 3, height: 2 });
      mockInputLayer2 = mockLayer({ width: 1, height: 2 });
      expect(() => {
        layer = new MultiplyElement(mockInputLayer1, mockInputLayer2);
      }).toThrow();
    });
    test('throws if heights are mismatched', () => {
      mockInputLayer1 = mockLayer({ width: 3, height: 2 });
      mockInputLayer2 = mockLayer({ width: 3, height: 1 });
      expect(() => {
        layer = new MultiplyElement(mockInputLayer1, mockInputLayer2);
      }).toThrow();
    });
    test('.weights are set to same as inputLayer as zeros', () => {
      expect(layer.weights).toEqual([
        new Float32Array([0, 0, 0]),
        new Float32Array([0, 0, 0]),
      ]);
    });
    test('.deltas are set to same as inputLayer as zeros', () => {
      expect(layer.deltas).toEqual([
        new Float32Array([0, 0, 0]),
        new Float32Array([0, 0, 0]),
      ]);
    });
  });

  describe('.predict (forward propagation)', () => {
    let mockInputLayer1: ILayer;
    let mockInputLayer2: ILayer;
    let layer: MultiplyElement;
    beforeEach(() => {
      mockInputLayer1 = mockLayer({
        width: 3,
        height: 2,
        weights: [
          [1, 2, 3],
          [4, 5, 6],
        ],
      });
      mockInputLayer2 = mockLayer({
        width: 3,
        height: 2,
        weights: [
          [7, 8, 9],
          [10, 11, 12],
        ],
      });
      layer = new MultiplyElement(mockInputLayer1, mockInputLayer2);
      layer.setupKernels();
    });
    it('releases .weights', () => {
      const deleteMock = jest.fn();
      const texture = mockTexture();
      layer.weights = texture;
      texture.delete = deleteMock;
      layer.predict();
      expect(deleteMock).toBeCalled();
    });
    test('can forward propagate from input layers', () => {
      layer.predict();
      expect(layer.weights).toEqual([
        new Float32Array([7, 16, 27]),
        new Float32Array([40, 55, 72]),
      ]);
    });
    it('clears deltas', () => {
      const texture = mockTexture();
      const clearMock = jest.fn();
      texture.clear = clearMock;
      layer.deltas = texture;
      layer.predict();
      expect(clearMock).toBeCalled();
    });
  });

  describe('.compare (back propagation)', () => {
    let mockInputLayer1: ILayer;
    let mockInputLayer2: ILayer;
    let layer: MultiplyElement;
    beforeEach(() => {
      mockInputLayer1 = mockLayer({
        width: 3,
        height: 2,
        weights: [
          [1, 2, 3],
          [4, 5, 6],
        ],
        deltas: null,
      });
      mockInputLayer2 = mockLayer({
        width: 3,
        height: 2,
        weights: [
          [7, 8, 9],
          [10, 11, 12],
        ],
        deltas: null,
      });
      layer = new MultiplyElement(mockInputLayer1, mockInputLayer2);
      layer.setupKernels();
      layer.deltas = [
        [13, 14, 15],
        [16, 17, 18],
      ];
    });
    test('can back propagate to input layers', () => {
      layer.compare();
      expect(mockInputLayer1.deltas).toEqual([
        new Float32Array([91, 112, 135]),
        new Float32Array([160, 187, 216]),
      ]);
      expect(mockInputLayer2.deltas).toEqual([
        new Float32Array([13, 28, 45]),
        new Float32Array([64, 85, 108]),
      ]);
    });
    test('releases inputLayer textures', () => {
      const deleteTexture1Mock = jest.fn();
      const deleteTexture2Mock = jest.fn();
      const deltas1 = mockTexture();
      const deltas2 = mockTexture();
      deltas1.delete = deleteTexture1Mock;
      deltas2.delete = deleteTexture2Mock;
      mockInputLayer1.deltas = deltas1;
      mockInputLayer2.deltas = deltas2;
      layer.compare();
      expect(deleteTexture1Mock).toHaveBeenCalled();
      expect(deleteTexture2Mock).toHaveBeenCalled();
    });
  });

  describe('predict (forward propagation)', () => {
    test('can multiply a simple matrix', () => {
      const inputs1 = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      const inputs2 = [
        [7, 8, 9],
        [10, 11, 12],
      ];
      const results = gpuMock(predict, {
        output: [3, 2],
      })(inputs1, inputs2);

      expect(results).toEqual([
        new Float32Array([7, 16, 27]),
        new Float32Array([40, 55, 72]),
      ]);
    });
  });

  // yea it is basically a clone of `predict`, but for naming conventions, we'll keep them separated
  describe('compare (back propagation)', () => {
    test('can multiply a simple matrix', () => {
      const weights = [
        [1, 2, 3],
        [4, 5, 6],
      ];
      const deltas = [
        [7, 8, 9],
        [10, 11, 12],
      ];
      const results = gpuMock(compare, {
        output: [3, 2],
      })(weights, deltas);

      expect(results).toEqual([
        new Float32Array([7, 16, 27]),
        new Float32Array([40, 55, 72]),
      ]);
    });
  });

  describe('multiplyElement function', () => {
    it('calls new MultiplyElement with inputLayer1 and inputLayer2', () => {
      const mockInputLayer1 = mockLayer({});
      const mockInputLayer2 = mockLayer({});
      const layer = multiplyElement(mockInputLayer1, mockInputLayer2);
      expect(layer.inputLayer1).toBe(mockInputLayer1);
      expect(layer.inputLayer2).toBe(mockInputLayer2);
    });
  });
});
