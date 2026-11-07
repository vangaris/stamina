import {
  ProfileStatus,
  RequestType,
  type GetNutritionRequest,
  type LogWaterRequest,
  type Mediator,
  type ProfileState,
  type Request,
  type SaveNutritionSetupRequest,
} from '@stamina/app-core';
import {
  NutritionStatus,
  SaveNutritionSetupStatus,
  type LogWater,
  type NutritionSetup,
  type NutritionState,
  type SaveNutritionSetupResult,
  type SavedProfile,
} from '@stamina/contracts';
import { makeReadyNutrition, LOCKED } from './make-ready-nutrition.ts';
import { makeSavedProfile } from './make-saved-profile.ts';

/** The person's clock in tests: midday on the day `makeReadyNutrition` is for. */
export const LOCAL_NOW = new Date(2026, 10, 7, 12);

/**
 * A mediator that answers the nutrition requests and the profile from what the test sets, and
 * records what was sent. A water log adds to the ready day's water, as the server would.
 */
export function createMockMediator() {
  const state = {
    nutrition: LOCKED as NutritionState,
    nutritionError: undefined as Error | undefined,
    profile: { status: ProfileStatus.Present, profile: makeSavedProfile() } as ProfileState,
    /** Undefined: saving answers with the day ready for what was sent. */
    saveOutcome: undefined as SaveNutritionSetupResult | Error | undefined,
    waterError: undefined as Error | undefined,
  };
  const requests: Request[] = [];
  const dates: string[] = [];
  const setups: NutritionSetup[] = [];
  const waterLogs: LogWater[] = [];

  async function answer(request: Request): Promise<unknown> {
    switch (request.type) {
      case RequestType.GetNutrition:
        dates.push((request as GetNutritionRequest).date);
        if (state.nutritionError) throw state.nutritionError;
        return state.nutrition;
      case RequestType.GetProfile:
        return state.profile;
      case RequestType.SaveNutritionSetup: {
        const { setup } = request as SaveNutritionSetupRequest;
        setups.push(setup);
        if (state.saveOutcome instanceof Error) throw state.saveOutcome;
        if (state.saveOutcome) return state.saveOutcome;
        state.nutrition = makeReadyNutrition({ setup });
        return { status: SaveNutritionSetupStatus.Saved, nutrition: state.nutrition };
      }
      case RequestType.LogWater: {
        const { water } = request as LogWaterRequest;
        waterLogs.push(water);
        if (state.waterError) throw state.waterError;
        if (state.nutrition.status === NutritionStatus.Ready) {
          const { water: day } = state.nutrition;
          state.nutrition = { ...state.nutrition, water: { ...day, ml: day.ml + water.ml } };
        }
        return { id: water.id, date: water.date, ml: water.ml };
      }
      default:
        throw new Error(`unexpected request ${request.type}`);
    }
  }

  const mediator = {
    send: async (request: Request) => {
      requests.push(request);
      return answer(request);
    },
  } as Mediator;

  function setProfile(profile: SavedProfile) {
    state.profile = { status: ProfileStatus.Present, profile };
  }

  return { mediator, state, requests, dates, setups, waterLogs, setProfile };
}
