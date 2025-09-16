import type { CryptoCurrency } from '@nimiq/utils';

// Other types we might want to add in the future could for example be burn addresses or addresses linked to sanctioned
// countries etc. It's worth noting that the Wallet does not censor any addresses. The user has the choice of continuing
// after being warned.
export enum FlaggedAddressType {
    MALICIOUS = 'malicious',
}

// EVM refers to addresses on a chain compatible with the Ethereum Virtual Machine like Polygon, which generally follow
// Ethereum's address format.
export type FlaggedAddressChain = `${CryptoCurrency.NIM}` | `${CryptoCurrency.BTC}` | 'evm';

// Addresses must be added in normalized form:
// - NIM addresses in uppercase and with grouping, as emitted by ValidationUtils.normalizeAddress of @nimiq/utils
// - BTC bech32 addresses in lowercase; legacy base58 addresses do not need to be normalized, as they are case-sensitive
// - EVM addresses in lowercase
//
// Static type checks are performed to check for correct normalization.

const FLAGGED_ADDRESSES = {
    [FlaggedAddressType.MALICIOUS]: {
        // https://jdstaerk.substack.com/p/we-just-found-malicious-code-in-the
        // https://gist.github.com/jdstaerk/9e73837f0ba23735ef04a736c6b97c09
        // https://github.com/debug-js/debug/issues/1005#issuecomment-3266868187
        // https://x.com/P3b7_/status/1965094840959410230
        '2025-09-npm-supply-chain-attack': {
            label: 'September 2025 NPM supply-chain attack',
            nim: [],
            btc: [
                '1H13VnQJKtT4HjD5ZFKaaiZEetMbG7nDHx',
                '1Li1CRPwjovnGHGPTtcKzy75j37K6n97Rd',
                '1Dk12ey2hKWJctU3V8Akc1oZPo1ndjbnjP',
                '1NBvJqc1GdSb5uuX8vT7sysxtT4LB8GnuY',
                '1Mtv6GsFsbno9XgSGuG6jRXyBYv2tgVhMj',
                '1BBAQm4DL78JtRdJGEfzDBT2PBkGyvzf4N',
                '1KkovSeka94yC5K4fDbfbvZeTFoorPggKW',
                '18CPyFLMdncoYccmsZPnJ5T1hxFjh6aaiV',
                '1BijzJvYU2GaBCYHa8Hf3PnJh6mjEd92UP',
                '1Bjvx6WXt9iFB5XKAVsU3TgktgeNbzpn5N',
                '19fUECa9aZCQxcLeo8FZu8kh5kVWheVrg8',
                '1DZEep7GsnmBVkbZR3ogeBQqwngo6x4XyR',
                '1GX1FWYttd65J26JULr9HLr98K7VVUE38w',
                '14mzwvmF2mUd6ww1gtanQm8Bxv3ZWmxDiC',
                '1EYHCtXyKMMhUiJxXJH4arfpErNto5j87k',
                '19D1QXVQCoCLUHUrzQ4rTumqs9jBcvXiRg',
                '16mKiSoZNTDaYLBQ5LkunK6neZFVV14b7X',
                '18x8S4yhFmmLUpZUZa3oSRbAeg8cpECpne',
                '1EkdNoZJuXTqBeaFVzGwp3zHuRURJFvCV8',
                '13oBVyPUrwbmTAbwxVDMT9i6aVUgm5AnKM',
                '1DwsWaXLdsn4pnoMtbsmzbH7rTj5jNH6qS',
                '13wuEH28SjgBatNppqgoUMTWwuuBi9e4tJ',
                '154jc6v7YwozhFMppkgSg3BdgpaFPtCqYn',
                '1AP8zLJE6nmNdkfrf1piRqTjpasw7vk5rb',
                '19F8YKkU7z5ZDAypxQ458iRqH2ctGJFVCn',
                '17J3wL1SapdZpT2ZVX72Jm5oMSXUgzSwKS',
                '16z8D7y3fbJsWFs3U8RvBF3A8HLycCW5fH',
                '1PYtCvLCmnGDNSVK2gFE37FNSf69W2wKjP',
                '143wdqy6wgY3ez8Nm19AqyYh25AZHz3FUp',
                '1JuYymZbeoDeH5q65KZVG3nBhYoTK9YXjm',
                '1PNM2L1bpJQWipuAhNuB7BZbaFLB3LCuju',
                '19onjpqdUsssaFKJjwuAQGi2eS41vE19oi',
                '1JQ15RHehtdnLAzMcVT9kU8qq868xFEUsS',
                '1LVpMCURyEUdE8VfsGqhMvUYVrLzbkqYwf',
                '1KMcDbd2wecP4Acoz9PiZXsBrJXHbyPyG6',
                '1DZiXKhBFiKa1f6PTGCNMKSU1xoW3Edb7Z',
                '174bEk62kr8dNgiduwHgVzeLgLQ38foEgZ',
                '17cvmxcjTPSBsF1Wi2HfcGXnpLBSzbAs6p',
                '1NoYvnedUqNshKPZvSayfk8YTQYvoB2wBc',
                '13694eCkAtBRkip8XdPQ8ga99KEzyRnU6a',
                'bc1qms4f8ys8c4z47h0q29nnmyekc9r74u5ypqw6wm',
                'bc1qznntn2q7df8ltvx842upkd9uj4atwxpk0whxh9',
                'bc1q4rllc9q0mxs827u6vts2wjvvmel0577tdsvltx',
                'bc1qj8zru33ngjxmugs4sxjupvd9cyh84ja0wjx9c4',
                'bc1qc972tp3hthdcufsp9ww38yyer390sdc9cvj8ar',
                'bc1qw0z864re8yvrjqmcw5fs6ysndta2avams0c6nh',
                'bc1qzdd8c7g2g9mnnxy635ndntem2827ycxxyn3v4h',
                'bc1qaavgpwm98n0vtaeua539gfzgxlygs8jpsa0mmt',
                'bc1qrdlkyhcrx4n2ksfjfh78xnqrefvsr34nf2u0sx',
                'bc1q9ytsyre66yz56x3gufhqks7gqd8sa8uk4tv5fh',
                'bc1qfrvsj2dkey2dg8ana0knczzplcqr7cgs9s52vq',
                'bc1qg7lkw04hg5yggh28ma0zvtkeg95k0yefqmvv2f',
                'bc1qmeplum3jy2vrlyzw4vhrcgeama35tr9kw8yfrn',
                'bc1qamqx0h8rxfcs4l56egrpau4ryqu4r642ttmxq4',
                'bc1qsaxgtck26mgecgfvp9ml4y5ljyl8ylpdglqz30',
                'bc1qsz90ulta8dx5k8xzzjqruzahav2vxchtk2l8v7',
                'bc1q3ad2zyc5mpc9nnzmmtxqpu467jeh4m928r7qf4',
                'bc1qlrdqrulwmvfg86rmp77k8npdefns52ykk8cxs6',
                'bc1q5hqxk5ugvf2d3y6qj2a7cy7u79ckusu9eknpsr',
                'bc1qszm3nugttmtpkq77dhphtqg4u7vuhxxcrh7f79',
                'bc1qqc09xnyafq0y4af3x7j5998tglxcanjuzy974m',
                'bc1qqqh29zxfzxk0fvmq9d7hwedh5yz44zhf7e23qz',
                'bc1qsg57tpvfj6gysrw5w4sxf3dweju40g87uuclvu',
                'bc1qje95nehs8y0wvusp2czr25p7kghk6j3cvgugy5',
                'bc1qwrnchp96p38u8ukp8jc8cq22q35n3ajfav0pzf',
                'bc1q6l99s704jccclxx5rc2x2c5shlgs2pg0fpnflk',
                'bc1qeuk2u6xl4rgfq0x9yc37lw49kutnd8gdlxt9st',
                'bc1qxul8lwxvt7lt9xuge0r2jls7evrwyyvcf2ah0u',
                'bc1qcplvxyzs9w09g6lpglj6xxdfxztfwjsgz95czd',
                'bc1q9ca9ae2cjd3stmr9lc6y527s0x6vvqys6du00u',
                'bc1qmap3cqss3t4vetg8z9s995uy62jggyxjk29jkp',
                'bc1qg3c6c7y5xeqkxnjsx9ymclslr2sncjrxjylkej',
                'bc1q9zx63qdjwldxp4s9egeqjelu3y5yqsajku8m29',
                'bc1ql2awtv7nzcp2dqce3kny2ra3dz946c9vg2yukq',
                'bc1qhytpe64tsrrvgwm834q35w6607jc6azqtnvl2a',
                'bc1q4rlgfgjwg9g2pqwqkf5j9hq6ekn39rjmzv09my',
                'bc1q28ks0u6fhvv7hktsavnfpmu59anastfj5sq8dw',
                'bc1qjqfpxvl2j2hzx2cxeqhchrh02dcjy3z5k6gv55',
                'bc1q8zznzs9z93xpkpunrmeqp6fg54s3q7dkh9z9xw',
                'bc1qt4c4e6xwt5dz4p629ndz9zmeep2kmvqgy53037',
            ],
            evm: [
                '0xfc4a4858bafef54d1b1d7697bfb5c52f4c166976',
                '0xa29eefb3f21dc8fa8bce065db4f4354aa683c024',
                '0x40c351b989113646bc4e9dfe66ae66d24fe6da7b',
                '0x30f895a2c66030795131fb66cbad6a1f91461731',
                '0x57394449fe8ee266ead880d5588e43501cb84cc7',
                '0xcd422ccc9f6e8f30ffd6f68c0710d3a7f24a026a',
                '0x7c502f253124a88bbb6a0ad79d9bed279d86e8f4',
                '0xe86749d6728d8b02c1eaf12383c686a8544de26a',
                '0xa4134741a64f882c751110d3e207c51d38f6c756',
                '0xd4a340cebe238f148034bbc14478af59b1323d67',
                '0xb00a433e1a5fc40d825676e713e5e351416e6c26',
                '0xd9df4e4659b1321259182191b683acc86c577b0f',
                '0x0a765fa154202e2105d7e37946cabb7c2475c76a',
                '0xe291a6a58259f660e8965c2f0938097030bf1767',
                '0xe46e68f7856b26af1f9ba941bc9cd06f295eb06d',
                '0xa7eec0c4911ff75aed179c81258a348c40a36e53',
                '0x3c6762469ea04c9586907f155a35f648572a0c3e',
                '0x322fe72e1eb64f6d16e6fcd3d45a376efd4bc6b2',
                '0x51bb31a441531d34210a4b35114d8ef3e57ab727',
                '0x314d5070db6940c8dedf1da4c03501a3acee21e1',
                '0x75023d76d6cbf88aceaa83447c466a9bbb0c5966',
                '0x1914f36c62b381856d1f9dc524f1b167e0798e5e',
                '0xb9e9cfd931647192036197881a9082cd2d83589c',
                '0xe88ae1ae3947b6646e2c0b181da75ce3601287a4',
                '0x0d83f2770b5bdc0ccd9f09728b3ebf195cf890e2',
                '0xe2d5c35bf44881e37d7183da2143ee5a84cd4c68',
                '0xd21e6dd2ef006ffae9be8d8b0cdf7a667b30806d',
                '0x93ff376b931b92af91241aaf257d708b62d62f4c',
                '0x5c068df7139ad2dedb840cec95c384f25b443275',
                '0x70d24a9989d17a537c36f2fb6d8198cc26c1c277',
                '0x0ae487200606defdbcef1a50c003604a36c68e64',
                '0xc5588a6dec3889aad85b9673621a71ffcf7e6b56',
                '0x3c23ba2db94e6ae11dbf9cd2da5297a09d7ec673',
                '0x5b5ca7d3089d3b3c6393c0b79cdf371ec93a3fd3',
                '0x4cb4c0e7057829c378eb7a9b174b004873b9d769',
                '0xd299f05d1504d0b98b1d6d3c282412fd4df96109',
                '0x241689f750fce4a974c953adbece0673dc4956e0',
                '0xbc5f75053ae3a8f2b9cf9495845038554ddfb261',
                '0x5651dbb7838146fcf5135a65005946625a2685c8',
                '0x5c9d146b48f664f2bb4796f2bb0279a6438c38b1',
                '0xd2bf42514d35952abf2082aaa0ddbbef65a00ba3',
                '0xbb1ec85a7d0aa6cd5ad7e7832f0b4c8659c44cc9',
                '0x013285c02ab81246f1d68699613447ce4b2b4acc',
                '0x97a00e100ba7ba0a006b2a9a40f6a0d80869ac9e',
                '0x4bf0c0630a562ee973ce964a7d215d98ea115693',
                '0x805aa8adb8440aea21fdc8f2348f8db99ea86efb',
                '0xae9935793835d5fcf8660e0d45ba35648e3cd463',
                '0xb051c0b7dcc22ab6289adf7a2dceaa7c35eb3027',
                '0xf7a82c48edf9db4fbe6f10953d4d889a5ba6780d',
                '0x06de68f310a86b10746a4e35cd50a7b7c8663b8d',
                '0x51f3c0fcacf7d042605abbe0ad61d6fabc4e1f54',
                '0x49bcc441aea6cd7bc5989685c917dc9fb58289cf',
                '0x7fd999f778c1867eda9a4026fe7d4bbb33a45272',
                '0xe8749d2347472ad1547e1c6436f267f0edd725cb',
                '0x2b471975ac4e4e29d110e43ebf9fbbc4aebc8221',
                '0x02004fe6c250f008981d8fc8f9c408cefd679ec3',
                '0xc4a51031a7d17bb6d02d52127d2774a942987d39',
                '0xa1b94fc12c0153d3fb5d60ed500acec430259751',
                '0xdedda1a02d79c3ba5fdf28c161382b1a7ba05223',
                '0xe55f51991c8d01fb5a99b508cc39b8a04dcf9d04',
            ],
        },
    },
} as const;
export default FLAGGED_ADDRESSES;

// Statically check normalization of addresses

type ValuesOf<T> = T[keyof T];
type ArrayEntriesOf<T extends any[] | readonly any[]> = T[number];
type __nimAddresses = ArrayEntriesOf<ValuesOf<ValuesOf<typeof FLAGGED_ADDRESSES>>['nim']>;
type __btcAddresses = ArrayEntriesOf<ValuesOf<ValuesOf<typeof FLAGGED_ADDRESSES>>['btc']>;
type __evmAddresses = ArrayEntriesOf<ValuesOf<ValuesOf<typeof FLAGGED_ADDRESSES>>['evm']>;

type CheckDigit<S extends string> = S extends `${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`
    ? true
    : never;
type CheckNimiqAddressAlphabet<S extends string> = S extends 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H' | 'J'
    | 'K' | 'L' | 'M' | 'N' | 'P' | 'Q' | 'R' | 'S' | 'T' | 'U' | 'V' | 'X' | 'Y' // also enforces uppercase
    ? true
    : CheckDigit<S>;
type CheckNimAddressChecksumFormat<S extends string> = S extends `${infer A}${infer B}`
    ? CheckDigit<A> & CheckDigit<B>
    : never;
type CheckNimAddressBlockFormat<S extends string> = S extends `${infer A}${infer B}${infer C}${infer D}`
    ? CheckNimiqAddressAlphabet<A> & CheckNimiqAddressAlphabet<B> & CheckNimiqAddressAlphabet<C>
        & CheckNimiqAddressAlphabet<D>
    : never;
type CheckNimAddressFormat<S extends string> =
    S extends `NQ${infer A} ${infer B} ${infer C} ${infer D} ${infer E} ${infer F} ${infer G} ${infer H} ${infer I}`
        ? true extends CheckNimAddressChecksumFormat<A> & CheckNimAddressBlockFormat<B> & CheckNimAddressBlockFormat<C>
            & CheckNimAddressBlockFormat<D> & CheckNimAddressBlockFormat<E> & CheckNimAddressBlockFormat<F>
            & CheckNimAddressBlockFormat<G> & CheckNimAddressBlockFormat<H> & CheckNimAddressBlockFormat<I>
            ? S
            : never
        : never;

type NormalizeBtcAddress<S extends string> = S extends `${'b' | 'B'}${'c' | 'C'}1${infer R}`
    ? `bc1${Lowercase<R>}`
    : S; // Legacy base58 addresses are case-sensitive and not to be normalized.

type NormalizeEvmAddress<S extends string> = Lowercase<S>;

// To statically check for non-normalized addresses, we filter the normalized addresses out via an Exclude. If all
// addresses are normalized, the Exclude will yield type never, which is a valid index for the empty object. However, if
// there is a non-normalized address, which will not be excluded, the result of Exclude will be non-empty, which is an
// invalid index for {} and results in a type error as desired. The type error will even tell us which addresses are not
// normalized.
/* eslint-disable @typescript-eslint/ban-types */
type __expectNormalizedNimAddresses = {}[Exclude<__nimAddresses, CheckNimAddressFormat<__nimAddresses>>];
type __expectNormalizedBtcAddresses = {}[Exclude<__btcAddresses, NormalizeBtcAddress<__btcAddresses>>];
type __expectNormalizedEvmAddresses = {}[Exclude<__evmAddresses, NormalizeEvmAddress<__evmAddresses>>];
/* eslint-enable @typescript-eslint/ban-types */
