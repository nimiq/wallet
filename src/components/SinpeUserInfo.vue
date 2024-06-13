<template>
  <div class="flex-column sinpe-user-info">
    <div class="logo">
      <!-- eslint-disable max-len -->
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="14" fill="none">
        <g fill="currentColor">
          <path
            d="M14.426 5.559c.193-.758.36-1.524.11-2.293-.214-.653-.737-1.226-1.407-1.38-.488-.113-1 0-1.474.157-2.264.751-4.042 2.474-5.936 3.923C7.472 4.088 9.414 2.36 11.642 1.08c.772-.444 1.587-.837 2.46-1.016.495-.102 1.069-.114 1.444.226.28.253.384.646.425 1.02.238 2.168-.772 4.346-1.614 6.285a23.274 23.274 0 0 1-1.285 2.488c-.448.765-.924 1.513-1.4 2.26a50.95 50.95 0 0 0 1.61-3.538" />
          <path
            d="M2.562 7.943c-.282.729-.54 1.47-.385 2.263.134.673.584 1.306 1.23 1.54.47.17.992.12 1.483.021 2.338-.473 4.31-1.97 6.365-3.18-1.967 1.653-4.103 3.136-6.469 4.139-.82.348-1.676.639-2.563.712-.505.042-1.076-.016-1.408-.399-.246-.284-.302-.687-.298-1.063.024-2.182 1.29-4.222 2.36-6.045A23.321 23.321 0 0 1 4.45 3.615a71.573 71.573 0 0 1 1.662-2.074 50.914 50.914 0 0 0-2.024 3.318" />
        </g>
      </svg>
      <!-- eslint-enable max-len -->
      <span>{{ initials }}</span>
    </div>
    <div class="user-info flex-column">
      <span class="user-name">
        {{ userName }}
      </span>
      <span class="phone-number">
        {{ phoneNumber }}
      </span>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent } from '@vue/composition-api';

export default defineComponent({
    props: {},
    setup() {
        const userName = 'Miguel Morales';
        const phoneNumber = '8888-8888';
        const initials = computed(() => userName.split(' ').map((n) => n[0]).join(''));

        return {
            userName,
            initials,
            phoneNumber,
        };
    },
    components: {
    },
});
</script>

<style scoped lang="scss">
.sinpe-user-info {
  padding: 1rem;
  width: 18rem;
  align-items: center;

  .logo {
    justify-content: center;
    background-color: #0D2D49;
    aspect-ratio: 1;
    height: 66px;
    border-radius: 999px;
    display: flex;
    flex-direction: column;
    color: #fff;
    text-align: center;
    font-size: 3rem;
    font-style: normal;
    font-weight: 600;
    line-height: normal;
  }

  .user-info {
    margin-top: 2rem;
    align-items: center;

    .user-name {
      color: var(--nimiq-blue);
      text-align: center;
      font-size: 2.25rem;
      font-weight: 600;
      line-height: 1.5;
    }
  }

  .phone-number {
    margin-top: 0.5rem;
    color: var(--nimiq-blue);
    opacity: 0.5;
    font-size: 1.875rem;
    font-weight: 400;
    line-height: 1.25;
    font-family: "Fira Mono";
    letter-spacing: 0.2px;
  }
}
</style>
