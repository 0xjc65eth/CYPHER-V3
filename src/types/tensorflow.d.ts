declare module '@tensorflow/tfjs-node' {
  export const version: string;
  export function tensor(values: any, shape?: number[], dtype?: string): any;
  export function tensor2d(values: any, shape?: [number, number], dtype?: string): any;
  export function tensor3d(values: any, shape?: [number, number, number], dtype?: string): any;
  export function model(args: any): any;
  export function sequential(args?: any): any;
  export const layers: any;
  export const train: any;
  export const losses: any;
  export const metrics: any;
  export const optimizers: any;
  export function loadLayersModel(url: string): Promise<any>;
  export function loadGraphModel(url: string): Promise<any>;
  export function tidy<T>(fn: () => T): T;
  export function dispose(tensor: any): void;
  export function memory(): any;
  export const backend: any;
  export type Tensor = any;
  export type Tensor1D = any;
  export type Tensor2D = any;
  export type Tensor3D = any;
  export type LayersModel = any;
}
