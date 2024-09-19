<template>
  <CalendarBase
    :is-day-disabled="isDayDisabled"
    :journey="getJourney"
    :min-date="minDate"
    :min-time-before-booking="minTimeBeforeBooking"
    :is-today-disabled="isTodayDisabled"
    :today-in-zone="todayInZone"
    :selected-date="selectedDate"
    :selected-time="selectedTime"
    @set-selected-date="setSelectedDate"
    @confirm="
      () => {
        updateValue();
        $parent.$emit('info-panel-open', null);
      }
    "
  >
    <div class="calendar-bottom-wrap">
      <div class="calendar-enough-time" v-if="!isArrivalTime">
        <ImageWrapper
          class="calendar-like-person"
          src="like-person.svg"
          alt="next"
        />
        <span v-html="$t('enough-time-between-arrival')" />
      </div>
      <Multiselect
        id="time-search"
        v-model="selectedTime"
        :options="d2gTimeSuggestions"
        :searchable="true"
        :close-on-select="true"
        :placeholder="`${$t('desired')} ${$t(
          isArrivalTime ? 'arrivalTime' : 'departureTime'
        )}`"
        label="display"
        :allow-empty="false"
        data-test="time-multiselect"
        track-by="display"
        class="d2g d2g-time-multiselect"
        :class="{ error: error }"
        @select="onTimeSelected"
      >
        <template #selection>
          <div class="multiselect-left">
            <svg width="32" height="32" viewBox="0 0 32 32">
              <use xlink:href="#airport-icon" />
            </svg>
          </div>
        </template>
      </Multiselect>
      <div class="estimated-time" :class="{ 'drop-off': !isArrivalTime }">
        <div class="estimated-time-inner">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="32"
            height="32"
            viewBox="0 0 32 32"
          >
            <use xlink:href="#bus-pick-up" />
          </svg>
          <div>
            <p class="estimated-time-text-top">
              {{ $t(isArrivalTime ? 'pick-up-time' : 'drop-off-time') }}
            </p>
            <p class="estimated-time-text-bottom">
              {{ $t('will-be-defined') }}
            </p>
          </div>
        </div>
        <svg
          v-tooltip.left="{
            content: $t(
              isArrivalTime ? 'pick-up-time-message' : 'drop-off-time-message'
            ),
            trigger: 'hover click',
          }"
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 18 18"
        >
          <use xlink:href="#distribusion-info-grey" />
        </svg>
      </div>
    </div>
  </CalendarBase>
</template>

<script lang="ts">
import { Component, Prop, Mixins } from 'vue-property-decorator';

// TODO remove
import Multiselect from 'vue-multiselect';
import moment from 'moment';
import 'moment-timezone';
import {
  Journey,
  Time,
  Day,
} from 'flibco-ui-shared/src/models/booking/bookingState';
import {
  //NormalizeDateTime,
  DEFAULT_TIME_ZONE_S2S,
  MAX_BOOKING_MONTH_TIME,
  DAY_LABELS,
} from 'flibco-ui-shared/src/utils/common';
import { NormalizeDateTime } from '@/utils/normalizeDateTime';
import LocalizationMixins from 'flibco-ui-shared/src/mixins/LocalizationMixins';
import ScheduleService from '@/services/ScheduleService';
import OpsZone from 'flibco-ui-shared/src/models/opsZone/OpsZone';
import { useD2GStore } from 'flibco-ui-shared/src/store/d2g-store';
import CalendarBase from 'flibco-ui-shared/src/components/CalendarBase.vue';
import { D2GDirectionEnum } from 'flibco-ui-shared/src/models/booking/Booking';

const appendZero = (item: number) =>
  `${item}`?.length < 2 ? `0${item}` : `${item}`;

type TimeSuggestion = {
  display: string;
  hour: number;
  minutes: number;
};

@Component({
  components: {
    Multiselect,
    CalendarBase,
  },
})
export default class Calendar extends Mixins(LocalizationMixins) {
  @Prop({
    default: undefined,
  })
  readonly options: any;

  @Prop({
    required: true,
  })
  readonly propertyName!: string;

  @Prop({
    default: false,
  })
  readonly error!: boolean;

  dayLabels: string[] = DAY_LABELS.slice();

  d2gTimeSuggestions: Array<TimeSuggestion> = [];

  selectedDate = new Date();

  selectedTime: Time | null = null;

  minTimeBeforeBooking = 0;

  minDate = new Date();

  isTodayDisabled = true;

  type = { value: '', fullValue: '' };

  d2gStore = useD2GStore();

  created() {
    this.setInitData();
    this.setType();
    this.minTimeBeforeBooking = this.isArrivalTime
      ? this.getZone.minTimeBeforeBooking
      : this.getZone.g2dMinTimeBeforeBooking;

    if (
      this.type.fullValue === 'returnJourney' &&
      this.d2gStore.outwardJourney
    ) {
      this.minDate = new Date(this.d2gStore.outwardJourney.date);
    }

    const hour: number = this.timeInTimeZone(new Date()).getHours();

    if (24 - hour <= this.minTimeBeforeBooking / 60) {
      this.selectedDate = moment(this.selectedDate).add(1, 'day').toDate();
    } else {
      this.isTodayDisabled = false;
    }
    if (this.minDate > this.selectedDate) {
      this.selectedDate = new Date(this.minDate);
    }
  }

  mounted() {
    const journey = this.getJourney;
    if (journey) {
      this.selectedDate = new Date(journey.date);
      this.selectedTime = journey.time;
    }

    this.updateD2GTimeSuggestions(
      moment(this.selectedDate || undefined).format('YYYY-MM-DD')
    );
  }

  get getJourney(): Journey | undefined {
    if (this.propertyName === 'outwardJourney') {
      return this.d2gStore.outwardJourney;
    }
    if (this.propertyName === 'returnJourney') {
      return this.d2gStore.returnJourney;
    }
    return undefined;
  }

  getDateInTimestamp(
    date: Date | string,
    timeZone = this.d2gStore.zone?.timeZone ?? '',
    format = 'DD/MM/YYYY - HH:mm'
  ): number {
    return +moment(date, format).tz(timeZone, true);
  }

  isDateValid(journey: Journey, currentJourneyType: string): boolean {
    const minTimeBeforeBooking: number =
      this.d2gStore.getTripType === currentJourneyType
        ? this.getZone.g2dMinTimeBeforeBooking
        : this.getZone.minTimeBeforeBooking;

    const minTime: number = +moment() + minTimeBeforeBooking * 60000;
    const journeyTime: number = this.getDateInTimestamp(journey?.display);

    return journeyTime < minTime;
  }

  setJourney(value: Journey) {
    const isError = this.isDateValid(value, D2GDirectionEnum.G2D);
    if (this.propertyName === 'outwardJourney') {
      this.d2gStore.setOutwardJourney(value);
      this.d2gStore.setOutwardJourneyError(isError);
    }
    if (this.propertyName === 'returnJourney') {
      this.d2gStore.setReturnJourneyError(isError);
      this.d2gStore.setReturnJourney(value);
    }
  }

  get isArrivalTime(): boolean {
    return (
      (this.d2gStore.isG2D && this.type.value === 'return') ||
      (this.d2gStore.isD2G && this.type.value === 'outward')
    );
  }

  get timeSuggestions() {
    const timeSuggestions: Array<TimeSuggestion> = [];

    this.selectedDate.setHours(0);
    this.selectedDate.setMinutes(0);
    this.selectedDate.setSeconds(0);
    this.selectedDate.setMilliseconds(0);

    let min = this.timeInTimeZone(
      moment().add(this.minTimeBeforeBooking, 'minutes').toDate()
    );

    if (
      this.type.fullValue === 'returnJourney' &&
      this.d2gStore.outwardJourney
    ) {
      const newMin: Date = new Date(this.d2gStore.outwardJourney.date);
      newMin.setHours(this.d2gStore.outwardJourney.time.hour || 0);
      newMin.setMinutes(this.d2gStore.outwardJourney.time.minutes || 0);
      min = +newMin > +min ? newMin : min;
    }

    const tripScheduleStep: number = this.getZone.tripScheduleStep;
    const increment: Date = new Date(this.selectedDate);

    while (increment.getDate() === this.selectedDate.getDate()) {
      const hour: number = increment.getHours();
      const minutes: number = increment.getMinutes();

      if (increment.getTime() > min.getTime()) {
        timeSuggestions.push({
          display: `${appendZero(hour)}:${appendZero(minutes)}`,
          hour,
          minutes,
        });
      }

      increment.setMinutes(minutes + tripScheduleStep);
    }

    return timeSuggestions;
  }

  get maxDaysForBooking(): number {
    return this.getZone.maxNumberOfDaysForFutureBooking;
  }

  get todayInZone() {
    return moment.tz(
      new Date(),
      this.getZone.timeZone || DEFAULT_TIME_ZONE_S2S
    );
  }

  setInitData() {
    this.minDate = new Date(this.todayInZone.format());
    this.dayLabels = DAY_LABELS.slice();
  }

  private isDayDisabled(day: Date): boolean {
    return moment(day).isAfter(moment().add(MAX_BOOKING_MONTH_TIME, 'month'));
  }

  setSelectedDate(day: Day) {
    if (!(moment().isSame(day.date, 'day') && this.isTodayDisabled)) {
      this.selectedDate = day.date;
      this.selectedTime = null;
      this.updateValue();
      this.updateD2GTimeSuggestions(day.date.toString());
    }
  }

  async updateD2GTimeSuggestions(date: string) {
    const zone = this.getZone;

    if (!zone) {
      return;
    }

    const suggestions = await ScheduleService.getScheduleByZoneId(
      zone.opsZoneId,
      moment(new Date(date)).format('YYYY-MM-DD')
    );

    this.d2gTimeSuggestions = suggestions
      .filter(s =>
        moment
          .tz(s, zone.timeZone)
          .isAfter(
            moment
              .tz(zone.timeZone)
              .add(this.minTimeBeforeBooking, 'minutes')
              .toDate()
          )
      )
      .map(s => {
        const time = moment.tz(s, zone.timeZone);

        return {
          display: `${appendZero(time.get('hour'))}:${appendZero(
            time.get('minute')
          )}`,
          hour: time.get('hour'),
          minutes: time.get('minute'),
        };
      });
  }

  onTimeSelected(value: Time | null) {
    this.selectedTime = value;
    this.updateValue();
    if (this.isArrivalTime) {
      this.$parent?.$emit('info-panel-open', {
        type: 'openHint',
        time: this.selectedTime?.display,
      });
    }
  }

  setType() {
    if (this.propertyName === 'returnJourney') {
      this.type = {
        value: 'return',
        fullValue: this.propertyName,
      };
    } else {
      this.type = {
        value: 'outward',
        fullValue: this.propertyName,
      };
    }
  }

  timeInTimeZone(date: Date): Date {
    const timeInZoneD2G = moment(date).tz(this.getZone.timeZone || '');
    return new Date(timeInZoneD2G.format());
  }

  dayIsLimited(day: Day): boolean {
    if (!this.maxDaysForBooking) {
      return false;
    }
    const todayTimestamp: number = this.timeInTimeZone(new Date()).getTime();
    const msInDay = 86400000;
    const dayTimestamp: number = day.date.getTime();
    // todo: rethink cut 1 day for time validation
    const maxDaysForBooking: number = this.maxDaysForBooking - 1;
    if (maxDaysForBooking * msInDay + todayTimestamp > dayTimestamp) {
      return false;
    }
    return true;
  }

  private updateValue() {
    const dateLine = this.selectedDate
      ? this.selectedDate.toLocaleDateString('fr-lu')
      : null;

    const timeLine = this.selectedTime?.display ?? null;

    const dateTimeLine = `${dateLine} - ${timeLine}`;

    const display: string =
      dateLine != null && timeLine != null
        ? dateTimeLine
        : (dateLine ?? '') + (timeLine ?? '');

    const value: Journey = {
      date: this.selectedDate,
      time: this.selectedTime as Time,
      display,
    };

    this.setJourney(value);

    if (
      this.type.value === 'outward' &&
      this.d2gStore.returnJourney &&
      NormalizeDateTime(value.date, value.time, this.getZone.timeZone || '') >=
        NormalizeDateTime(
          this.d2gStore.returnJourney.date,
          this.d2gStore.returnJourney.time,
          this.getZone.timeZone
        )
    ) {
      this.d2gStore.setReturnJourney(undefined);
    }
  }

  get getZone(): OpsZone {
    return this.d2gStore.zone as OpsZone;
  }
}
</script>
