<template>
  <div class="form-wrapper">
    <LoadingSpinner
      added-classes="spinner--bus"
      v-if="isLoading"
      src="arrival_animation.gif"
    />
    <div class="form">
      <ImageWrapper classes="logo" src="d2g-logo.png" alt="door2gate" />
      <SwitchBookingType @reset-gtm-data="resetGtmData" />
      <div v-if="!isMobile" class="desktop-location-wrapper">
        <DirectionSelection
          class="location-wrapper"
          ref="directionSelection"
          :location-properties="locationProperties"
          @on-address-selected="onAddressSelected"
          @click="clear"
        />
        <svg class="swap" width="32" height="32" @click="swap">
          <use xlink:href="#locate" />
        </svg>
      </div>
      <div class="location-wrapper" v-else>
        <ValueInput
          v-for="(propertyName, index) in locationProperties"
          :key="propertyName"
          :property="getPropertyFromStore(propertyName)"
          data-test="input-wrapper"
          class="grey"
          :placeholder="locationPlaceholder(index)"
          :property-name="propertyName"
          :class="[
            isLocationSelectorActive(currentProperty, propertyName),
            isLocationTopPosition(index),
          ]"
          :classes="{ 'input-semibold': true }"
        >
          <template>
            <ImageWrapper
              :src="airportIcon(propertyName)"
              :alt="propertyName"
            />
            <svg
              v-show="getDepartureOrDestination(propertyName)"
              width="26"
              height="26"
              class="close"
              @click="clear(propertyName)"
            >
              <use xlink:href="#plus" />
            </svg>
          </template>
        </ValueInput>
        <svg class="swap" width="32" height="32" @click="swap">
          <use xlink:href="#locate" />
        </svg>
      </div>
      <ShuttleTypeSwitcher :zone="d2gStore.zone" />
      <BookingDates :currentProperty="currentProperty" />
      <div class="round-wrap">
        <RoundTrip
          :info-component="infoComponent"
          :disabled-prop="'returnJourney'"
          :round-trip="d2gStore.isRoundTrip"
          @disable="disableRoundTripField"
          @toggle="toogleRoundTrip"
        />
      </div>
      <div class="traveller-wrapper">
        <ValueInput
          class="full"
          :placeholder="t('passengers.multiValue')"
          :property="getPropertyFromStore('passengers')"
          property-name="passengers"
          :disabled="!d2gStore.zone"
          :class="{
            active: isPassengers(currentProperty),
            disabled: !d2gStore.zone,
          }"
        >
          <ImageWrapper src="traveller.svg" alt="traveller" />
        </ValueInput>
      </div>
      <div class="button-wrap">
        <CButton
          data-test="button-wrap"
          :disabled="!d2gStore.isFormValid"
          :text="t('search')"
          @click="bookNow"
        />
      </div>
    </div>
    <div v-if="infoComponent" class="info-panel" data-test="info-panel">
      <div class="info-component-wrapper">
        <CloseButton @close-click="closeInfoPanel" />
        <p
          v-if="infoComponent?.title"
          v-show="
            infoComponent?.componentName.indexOf('map-wrapper') === -1 &&
            infoComponent?.componentName.indexOf('mapWrapper') === -1
          "
          class="title"
        >
          {{ t(infoComponent.title) }}
        </p>
        <component
          ref="infoComponentRef"
          :is="infoComponent.component"
          :key="infoComponent.propertyName"
          :property-name="infoComponent.propertyName"
          :options="infoComponent.options"
          :error="infoComponentError"
          :is-mobile-stops-search="isMobile"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useD2GStore } from 'flibco-ui-shared/src/store/d2g-store';
import { onMounted, ref, computed, defineEmits, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router/composables';
import { useI18n } from 'vue-i18n-composable';
import { useViewport } from 'flibco-ui-shared/src/hooks/useViewport';

import { useD2GBookingFormComposables } from '@/hooks/D2G/d2gBookingForm.composables';
import usePrefillData from '@/hooks/D2G/usePrefillData';
import useRoundTripBookingForm from '@/hooks/useRoundTripBookingForm';
import BookingService from 'flibco-ui-shared/src/services/BookingService';
import BackErrorResolver from 'flibco-ui-shared/src/services/BackErrorResolver';
import DirectionSelection from './DirectionSelection.vue';
import {
  Destination,
  Gate,
} from 'flibco-ui-shared/src/models/booking/bookingState';
import GateDto from 'flibco-ui-shared/src/models/GateDto';
import D2GAlternativeTimeSlots from '@/services/D2GAlternativeTimeSlots';
//import { NormalizeDateTime } from 'flibco-ui-shared/src/utils/common';
import { NormalizeDateTime } from '@/utils/normalizeDateTime';
import MapWrapper from '@/components/D2G/mapWrapper/MapWrapper.vue';
import SwitchBookingType from '@/components/controls/booking/SwitchBookingType.vue';
import BookingDates from './BookingDates.vue';
import ValueInput from 'flibco-ui-shared/src/components/controls/booking/ValueInput.vue';
import ShuttleTypeSwitcher from './ShuttleTypeSwitcher.vue';

import RoundTrip from 'flibco-ui-shared/src/components/controls/booking/RoundTrip.vue';
import Calendar from './Calendar.vue';
import D2GPassengers from './D2GPassengers.vue';
import { useEmitter } from 'flibco-ui-shared/src/hooks/useEmitter';
import { useGtmStore } from 'flibco-ui-shared/src/store/gtm-store';
import { AxiosResponse } from 'flibco-ui-shared/src/utils/flibco-axios';

const d2gBookingEmit = defineEmits(['clear-location']);

const d2gStore = useD2GStore();
const { t } = useI18n();
const router = useRouter();
const route = useRoute();
const { setGtmFunnelData } = useGtmStore();

const infoComponent = ref<any>(null);
const infoComponentRef = ref<any>(null);
const directionSelection = ref<DirectionSelection | null>(null);

const {
  getZone,
  init,
  checkDate,
  airportIcon,
  getDepartureOrDestination,
  isPassengers,
  isLocationSelectorActive,
  isLocationTopPosition,
  getPropertyFromStore,
} = useD2GBookingFormComposables();

const { prefillByQuery } = usePrefillData();

const { disableRoundTripField, toogleRoundTrip } = useRoundTripBookingForm();
const { isMobile } = useViewport();
const currentProperty = ref<string>('');
const isLoading = ref<boolean>(false);
const locationProperties = ['departure', 'destination'];

const { on, rootEmit } = useEmitter();

init();

const mounted = async () => {
  await prefillByQuery();
  on('info-panel-open', infoPanelComponentOpenHandler);
};

onMounted(() => {
  mounted();
});

function infoPanelComponentOpenHandler(data: any) {
  closeInfoPanel();

  infoComponent.value = data ? { ...data } : null;
  if (data) {
    infoComponent.value && (infoComponent.value.componentName = data.component);

    const isMapComponent =
      ['MapWrapper', 'map-wrapper'].indexOf(
        infoComponent.value?.componentName
      ) !== -1;
    if (isMapComponent) {
      const locationSearchComponent = directionSelection.value;
      if (locationSearchComponent) {
        const selectedSearchComponent = locationSearchComponent?.$children.find(
          (child: unknown) =>
            (child as { propertyName: string })?.propertyName ===
            data.propertyName
        );
        selectedSearchComponent?.$el?.querySelector('input')?.focus();
      }
    }

    if (data.type === 'openHint') {
      rootEmit('open-dialog', {
        name: 'Time',
        options: { time: data.time },
      });

      document.getElementById('time-dialog')?.scrollIntoView({
        behavior: 'smooth',
      });
      closeInfoPanel();
    } else {
      currentProperty.value = data.propertyName;
    }

    switch (infoComponent.value?.componentName) {
      case 'map-wrapper':
      case 'mapWrapper':
        infoComponent.value.component = MapWrapper;
        break;
      case 'calendar':
        infoComponent.value.component = Calendar;
        break;
      case 'D2GPassengers':
        infoComponent.value.component = D2GPassengers;
    }
  } else {
    closeInfoPanel();
  }
}

function closeInfoPanel() {
  d2gStore.validateDate(infoComponent.value?.propertyName);
  infoComponent.value = null;
  currentProperty.value = '';
}

function clear(propertyName: string) {
  if (propertyName === 'departure') {
    d2gStore.setDeparture(undefined);
  }
  if (propertyName === 'destination') {
    d2gStore.setDestination(undefined);
  }

  d2gBookingEmit('clear-location', propertyName);
}

function swap() {
  closeInfoPanel();
  d2gStore.toggleTripType();
  checkDate();
}

async function checkBookingAllowed(): Promise<boolean> {
  const destination = d2gStore.destination as Gate;
  const departure = d2gStore.departure as Gate;
  let door: Destination | Gate;
  let gateId: string;
  const isAirportDirection = destination.airport && departure.airport;

  if (isAirportDirection) {
    door = departure;
    gateId =
      getZone.value.gates
        .filter((gate: GateDto) => gate.enabled)
        .find((gate: GateDto) => gate.code === destination.name)?.gateId ?? '';
  } else {
    door =
      d2gStore.getAirportStopDirection === 'departure'
        ? destination
        : departure;
    gateId =
      getZone.value.gates
        .filter((gate: GateDto) => gate.enabled)
        .find((gate: GateDto) => gate.code === d2gStore.gate?.name)?.gateId ??
      '';
  }

  if (!d2gStore.outwardJourney) {
    return false;
  }

  let dateTimeRound = 0;
  if (d2gStore.isRoundTrip && d2gStore.returnJourney) {
    dateTimeRound = NormalizeDateTime(
      d2gStore.returnJourney?.date,
      d2gStore.returnJourney?.time,
      getZone.value.timeZone
    );
  }

  const tripType = `${d2gStore.getTripType}${
    d2gStore.isRoundTrip ? '_RETURN' : ''
  }`;
  const adultsCount = d2gStore.getPassengers?.adults ?? 0;
  const infantsCount = d2gStore?.getPassengers?.children ?? 0;

  try {
    const bookingRequest = await BookingService.checkBookingAllowed({
      privateShuttle: d2gStore.isPrivateShuttle,
      tripType,
      adultsCount,
      infantsCount,
      doorLatitude: door?.lat,
      doorLongitude: door?.lon,
      opsZoneId: getZone.value.opsZoneId,
      dateTime: NormalizeDateTime(
        d2gStore.outwardJourney.date,
        d2gStore.outwardJourney.time,
        getZone.value.timeZone
      ),
      dateTimeRound,
      gateId,
    });
    d2gStore.setPrice(bookingRequest.price);
    d2gStore.setBookingRequestId(bookingRequest.bookingRequestId);

    return true;
  } catch (e: unknown) {
    handleErrorBookingAllowance(e as { data: { errorCode: string } });
    return false;
  }
}

function handleErrorBookingAllowance(e: { data: { errorCode: string } }) {
  if (e?.data.errorCode === 'D2G_BOOKING_TRIP_DATE_TIME_NOT_VALID') {
    d2gStore.resetJourneys();
  }

  const isTimeSlotCode = D2GAlternativeTimeSlots.isTimeSlotCode(
    e?.data
      .errorCode as keyof typeof D2GAlternativeTimeSlots.timeSlotsErrorsCodes
  );

  let errorOpts = {};
  if (isTimeSlotCode) {
    infoComponent.value = null;
    errorOpts = {
      name: 'TimeSlotsModal',
      options: D2GAlternativeTimeSlots.getOptions(e?.data.errorCode),
    };
  } else {
    errorOpts = {
      name: 'error',
      options: {
        message: BackErrorResolver.resolve(e as AxiosResponse),
      },
    };
  }

  rootEmit('open-dialog', errorOpts);
}

function validateForm(): boolean {
  let result = true;
  if (
    d2gStore.outwardJourney?.error ||
    !d2gStore.outwardJourney?.time?.display
  ) {
    result = false;
    d2gStore.outwardJourney &&
      d2gStore.setOutwardJourney({
        ...d2gStore.outwardJourney,
        error: ' ',
      });
  }

  if (
    d2gStore.isRoundTrip &&
    (d2gStore.returnJourney?.error || !d2gStore.returnJourney?.time?.display)
  ) {
    result = false;
    d2gStore.returnJourney &&
      d2gStore.setReturnJourney({
        ...d2gStore.returnJourney,
        error: ' ',
      });
  }
  return result;
}

function resetGtmData(): void {
  setGtmFunnelData({
    fromDeparture: null,
    toArrival: null,
  });
}

async function bookNow() {
  if (!validateForm()) {
    return;
  }
  isLoading.value = true;
  if (await checkBookingAllowed()) {
    setGtmFunnelData({
      fromDeparture: d2gStore.departure ?? null,
      toArrival: d2gStore.destination ?? null,
    });
    d2gStore.cleanBeforeOrder();
    router.push({
      name: 'd2g-order-summary',
      query: { ...(route.query ?? {}) },
    });
  }
  d2gStore.setPassengersDataRequired(getZone.value.passengersDataRequired);
  isLoading.value = false;
}

const infoComponentError = computed<boolean>(() => {
  return (
    (infoComponent.value?.propertyName === 'outwardJourney' &&
      d2gStore.isOutwardJourneyError) ||
    (infoComponent.value?.propertyName === 'returnJourney' &&
      d2gStore.isReturnJourneyError)
  );
});

function locationPlaceholder(index: number) {
  return t(index === 0 ? 'D2G-destination' : 'G2D-destination');
}

function onAddressSelected(address: Gate) {
  const isMapComponent =
    ['MapWrapper', 'map-wrapper'].indexOf(
      infoComponent.value?.componentName
    ) !== -1;

  if (isMapComponent) {
    (infoComponentRef.value as MapWrapper)?.addressSelected(address);
  }
}

watch(
  () => d2gStore.destination as Gate | Destination,
  (newVal: Gate | Destination) => {
    setGtmFunnelData({
      fromDeparture: d2gStore.departure ?? null,
      toArrival: newVal ?? null,
    });
  },
  {
    immediate: true,
  }
);

watch(
  () => d2gStore.departure as Gate | Destination,
  (newVal: Gate | Destination) => {
    setGtmFunnelData({
      fromDeparture: newVal ?? null,
      toArrival: d2gStore.destination ?? null,
    });
  },
  {
    immediate: true,
  }
);
</script>
<style lang="scss" scoped>
@import 'flibco-ui-shared/src/assets/style/_variables.scss';

.form-wrapper {
  margin-top: 62px;
  position: relative;

  .form,
  .info-panel {
    width: 386px;
    min-height: 630px;
    padding-bottom: 40px;
    border-radius: 9px;
    box-sizing: border-box;
    background-color: $white;

    @media (max-width: 767px) {
      height: auto;
    }
  }

  .round-wrap {
    padding: 0 20px;
    width: 100%;

    @media (max-width: 767px) {
      padding: 0;
    }
  }

  .close {
    position: absolute;
    right: 1px;
    top: 50%;
    transform: translateY(-50%) rotate(45deg);
    fill: $grey;
  }

  .form {
    position: relative;
    z-index: 3;
    display: flex;
    align-items: center;
    flex-direction: column;
    justify-content: flex-start;
    box-shadow: 1px 1px 20px 10px $black-shadow;
    padding-top: 29px;

    .logo {
      width: 150px;
    }

    .booking-switcher {
      margin-top: 20px;

      a,
      a:visited,
      a:active {
        color: black;
      }
    }

    .desktop-location-wrapper {
      position: relative;
      width: 100%;
      .swap {
        position: absolute;
        top: 52px;
        right: 30px;
        cursor: pointer;
        fill: $light-green;
        color: $green;
        transition: all 0.3s;

        &:active,
        &:hover,
        &:focus {
          color: $dark-green;
        }
      }
    }

    .location-wrapper {
      position: relative;
      margin-top: 20px;

      .swap {
        position: absolute;
        top: 32px;
        right: 30px;
        cursor: pointer;
        fill: $light-green;
        color: $green;
        transition: all 0.3s;

        &:active,
        &:hover,
        &:focus {
          color: $dark-green;
        }
      }
    }
  }

  .button-wrap {
    margin-top: 22px;
    box-sizing: border-box;
    width: 100%;
    padding: 0 15px;
  }

  .info-panel {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 379px;
    z-index: 4;
    box-shadow: 0 0 7px 3px $black-shadow;

    @media (max-width: 990px) {
      width: 370px;
    }

    .info-component-wrapper {
      padding-top: 20px;
      display: flex;
      flex-direction: column;
      height: 100%;
      box-sizing: border-box;

      .title {
        font-weight: 700;
        font-size: 24px;
        color: $green;
        margin-bottom: 20px;
        text-align: center;

        @media (max-width: 767px) {
          margin-bottom: 10px;
        }
      }

      .close-wrapper {
        position: absolute;
        top: 12px;
        right: 16px;
        cursor: pointer;
      }
    }
  }

  ::v-deep .input-wrapper.error {
    .info-text {
      color: $error;
    }
  }
}

@media (max-width: 767px) {
  .form-wrapper {
    margin-top: 15px;
    width: 100%;

    img {
      height: auto;
    }

    .button-wrap {
      padding: 0;
    }

    .form {
      width: 100%;
      padding: 30px 15px 20px;

      .booking-switcher {
        width: 100%;

        .inactive,
        .active {
          width: 50%;
        }
      }

      .location-wrapper,
      .round-trip-wrapper,
      .shuttle-type-wrapper,
      .traveller-wrapper {
        width: 100%;
      }

      .location-wrapper {
        .swap {
          right: 5px;
        }

        ::v-deep span.error {
          display: none;
        }
      }
    }

    .info-panel {
      position: fixed;
      top: 0;
      bottom: 0;
      padding: 8vh 0 5vh;
      z-index: 1000;
      background: #00000050;
      left: 0;
      width: 100%;
      box-shadow: 1px 1px 20px 10px $black-shadow;
      overflow: auto;

      .info-component-wrapper {
        position: relative;
        border-radius: 10px;
        background: $white;
        padding-top: 15px;
        height: 100%;
        overflow: auto;
        z-index: 1000;
      }
    }
  }
}
</style>
