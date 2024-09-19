<template>
  <div
    class="background"
    :class="isS2S ? 'background-s2s' : 'background-d2g'"
    :style="{ backgroundImage: background ? `url(${background})` : undefined }"
  >
    <div class="background-container">
      <div class="booking-form-wrapper">
        <slot />
      </div>
      <div class="panel">
        <div class="panel-container">
          <!--PANEL CONTENT-->
          <div class="panel-content">
            <p v-if="title && hasTitle" class="title" v-html="title" />
            <p v-else class="title">
              {{ t(isS2S ? 'shuttle-bus' : 'd2g') }}&nbsp;
            </p>
            <p v-if="subtitle && hasTitle" class="title" v-html="subtitle" />
            <p v-else class="title">
              {{ t(isS2S ? 's2s.home-banner-text' : 'home-banner-text') }}
            </p>
            <div v-if="description" class="info" v-html="description" />
            <p v-else class="info">
              {{
                t(
                  isS2S
                    ? 's2s.home-banner-second-text'
                    : 'home-banner-second-text'
                )
              }}
            </p>
          </div>
        </div>
        <div class="lets-go-wrapper">
          <image-wrapper src="lets-go.png" alt="lets-go" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n-composable';
import { isString } from 'lodash';
import { useMainStore } from 'flibco-ui-shared/src/store/main-store';

type DrupalJSONType = {
  background_s2s: string;
  background_d2g: string;
  title_s2s: string;
  title_d2g: string;
  subtitle_s2s: string;
  subtitle_d2g: string;
  description_s2s: string;
  description_d2g: string;
};

const { t } = useI18n();
const mainStore = useMainStore();

const decodeHtml = (html: string): string => {
  const text = document.createElement('textarea');

  text.innerHTML = html;

  return text.value;
};

const drupalJSON = computed((): DrupalJSONType | Record<string, string> => {
  const drupalElement = document.getElementById('drupal-config');

  try {
    return drupalElement
      ? Object.entries(JSON.parse(drupalElement.innerHTML))?.reduce(
          (acc, [key, value]) => ({
            ...acc,
            [key]: isString(value) ? decodeHtml(value) : value,
          }),
          {}
        )
      : {};
  } catch (e: unknown) {
    return {};
  }
});

const hasTitle = computed(
  () => Boolean(title.value) || Boolean(subtitle.value)
);

const title = computed(() =>
  isS2S.value ? drupalJSON.value.title_s2s : drupalJSON.value.title_d2g
);

const subtitle = computed(() =>
  isS2S.value ? drupalJSON.value.subtitle_s2s : drupalJSON.value.subtitle_d2g
);

const description = computed(() =>
  isS2S.value
    ? drupalJSON.value.description_s2s
    : drupalJSON.value.description_d2g
);

const background = computed(() =>
  isS2S.value
    ? drupalJSON.value.background_s2s
    : drupalJSON.value.background_d2g
);

const isS2S = computed(() => mainStore.isS2S);
</script>

<style lang="scss" scoped>
/* copied from static css */
.background-s2s {
  background-image: url('../assets/img/background-s2s.jpg');
}

.background-d2g {
  background-image: url('../assets/img/background.jpg');
}

.background {
  background-color: white;
  background-repeat: no-repeat;
  background-size: cover;
  background-position-x: center;
  display: flex;
  justify-content: center;

  .background-container {
    display: flex;
    align-items: flex-end;
    width: 1200px;

    .booking-form-wrapper {
      display: flex;
      align-items: flex-end;
      margin-bottom: 55px;
      position: relative;
    }

    .panel {
      position: relative;
      width: 554px;
      opacity: 0.9;
      padding: 16px 20px;
      background-color: #fff;
      border-radius: 10px;
      margin-left: 18px;
      margin-bottom: 55px;

      .title {
        font-weight: 700;
        font-size: 44px;
        color: #7ac142;
      }

      .info {
        margin-top: 10px;
        font-size: 21px;
        line-height: 26px;

        ::v-deep p {
          font-size: 21px;
          line-height: 26px;
        }
      }

      .lets-go-wrapper {
        position: absolute;
        top: 0;
        left: 0;
        transform: translateY(-120%);
      }
    }
  }
}

.hint {
  @media (max-width: 1000px) {
    transform: translate(-10px, -30px) rotate(-10deg);
  }

  @media (max-width: 767px) {
    transform: translate(20px, -30px) rotate(-10deg);
  }
}

@media (max-width: 1300px) {
  .background .background-container {
    width: 970px;
  }
}

@media (max-width: 1000px) {
  .background .background-container {
    width: 750px;

    .panel {
      .title {
        font-size: 32px;
        display: inline;
      }

      .info {
        font-size: 18px;
        line-height: 1.4;
      }
    }
  }
}

@media (max-width: 767px) {
  .background {
    background: none;

    .background-container {
      width: 100%;
      padding: 0 15px;
      flex-direction: column;

      .booking-form-wrapper {
        order: 2;
        width: 100%;
      }

      .panel {
        order: 1;
        width: 100%;
        margin-bottom: 0;
        display: none;

        .title {
          text-align: center;
          font-size: 26px;
        }

        .info {
          display: none;
        }

        .lets-go-wrapper {
          display: none;
        }
      }
    }
  }
}
</style>
