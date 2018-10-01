<template>
    <div class="login-list">
        <div class="login-entry" v-for="login in logins" @click="loginSelected(login.id)" :key="login.id">
            <Login :id="login.id"
                   :label="login.label"
                   :numberAccounts="login.addresses.size + login.contracts.length"
                   :type="login.type"
                   :show-arrow="showArrows"/>
        </div>
    </div>
</template>

<script lang="ts">
import {Component, Emit, Prop, Vue} from 'vue-property-decorator';
import Login from './Login.vue';

@Component({components: {Login}})
export default class LoginList extends Vue {
    @Prop(Array) private logins!:
        Array<{ id: string, label: string, addresses: Map<string, any>, contracts: any[], type: number }>;
    @Prop({type: Boolean, default: false}) private showArrows!: boolean;

    @Emit()
    // tslint:disable-next-line no-empty
    private loginSelected(id: string) {}
}
</script>

<style scoped>
    .login-list {
        overflow-y: auto;
    }

    .login-entry {
        cursor: pointer;
        transition: background 300ms;
    }

    .login-entry:hover {
        background-color: rgba(128, 128, 128, 0.1);
    }
</style>
