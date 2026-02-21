declare module 'jsonwebtoken' {
  export interface SignOptions {
    expiresIn?: string | number;
    algorithm?: string;
  }
  export function sign(payload: string | object | Buffer, secretOrPrivateKey: string, options?: SignOptions): string;
  export function verify(token: string, secretOrPublicKey: string, options?: object): any;
  export function decode(token: string, options?: object): any;
  const jwt: {
    sign: typeof sign;
    verify: typeof verify;
    decode: typeof decode;
  };
  export default jwt;
}
