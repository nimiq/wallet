import Vue from 'vue';

// This is just syntactic sugar for Vue.nextTick which does not make much sense,
// but it is used so the migration to Vue 3 is easier.
export const { nextTick } = Vue;
