import type Vue from 'vue';

// Don't unwrap component instances stored in refs, e.g. template refs, like Vue 3 does for ComponentPublicInstance.
// Otherwise, Vue 2.7's UnwrapRef maps the instance type structurally, such that it isn't assignable to the component's
// type anymore.
declare module 'vue' {
    export interface RefUnwrapBailTypes {
        vueInstance: Vue;
    }
}
