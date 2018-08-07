<template>
    <div class="login-list">
        <div class="login-entry" v-for="login in logins" @click="loginSelected(login.id)">
            <Login :user-friendly-id="login.userFriendlyId"
                   :label="login.label"
                   :id="login.id"
                   :key="login.id"/>
        </div>
    </div>
</template>

<script lang="ts">
    import {Component, Emit, Prop, Vue} from 'vue-property-decorator';
    import Login from './Login.vue';

    @Component({components: {Login}})
    export default class LoginList extends Vue {
        @Prop(Array) public logins!: Array<{ label: string, userFriendlyId: string, id: string }>;

        @Emit()
        // tslint:disable-next-line
        private loginSelected(id: string) {
        }
    }
</script>

<style scoped>

    .login-list .login-entry {
        padding: 0.3rem;
        border: 2px dashed transparent;
        cursor: pointer;
        transition: background .2s;
    }

    .login-list .login {
        margin: 0 auto;
    }

    .login-list .login-entry:hover {
        background-color: rgba(128, 128, 128, 0.1);
    }
</style>
