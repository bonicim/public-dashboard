// Recidiviz - a data platform for criminal justice reform
// Copyright (C) 2020 Recidiviz, Inc.
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.
// =============================================================================

import assertNever from "assert-never";
import { makeAutoObservable, runInAction } from "mobx";
import { MetricTypeIdList, TenantContent, TenantId } from "../contentApi/types";
import {
  DemographicsByCategoryRecord,
  fetchMetrics,
  HistoricalPopulationBreakdownRecord,
  parolePopulationCurrent,
  parolePopulationHistorical,
  paroleProgramParticipationCurrent,
  paroleRevocationReasons,
  paroleSuccessRateDemographics,
  paroleSuccessRateMonthly,
  PopulationBreakdownByLocationRecord,
  prisonAdmissionReasons,
  prisonPopulationCurrent,
  prisonPopulationHistorical,
  prisonReleaseTypes,
  prisonStayLengths,
  probationPopulationCurrent,
  probationPopulationHistorical,
  probationProgramParticipationCurrent,
  probationRevocationReasons,
  probationSuccessRateDemographics,
  probationSuccessRateMonthly,
  ProgramParticipationCurrentRecord,
  RawMetricData,
  recidivismRateAllFollowup,
  recidivismRateConventionalFollowup,
  RecidivismRateRecord,
  sentencePopulationCurrent,
  SentenceTypeByLocationRecord,
  sentenceTypesCurrent,
  SupervisionSuccessRateDemographicsRecord,
  SupervisionSuccessRateMonthlyRecord,
} from "../metricsApi";
import { AnyRecord, CollectionMap, MetricMapping } from "./types";

type DataTransformer<RecordFormat> = (rawData: RawMetricData) => RecordFormat[];

type InitOptions<RecordFormat> = {
  name: string;
  description: string;
  methodology: string;
  tenantId: TenantId;
  dataTransformer: DataTransformer<RecordFormat>;
  sourceFileName: string;
};

/**
 * Represents a single dataset backed by data from our metrics API.
 * The recommended way to instantiate `Metrics` is with the `createMetricMapping`
 * factory exported from this module.
 */
export default class Metric<RecordFormat extends AnyRecord> {
  // metadata properties
  readonly description: string;

  readonly methodology: string;

  readonly name: string;

  // relationships
  collections: CollectionMap = new Map();

  // we don't really need the entire Tenant object,
  // only the ID for use in the API request
  readonly tenantId: TenantId;

  // data properties
  private readonly dataTransformer: DataTransformer<RecordFormat>;

  private readonly sourceFileName: string;

  isLoading?: boolean;

  private allRecords?: RecordFormat[];

  error?: Error;

  constructor({
    name,
    description,
    methodology,
    tenantId,
    dataTransformer,
    sourceFileName,
  }: InitOptions<RecordFormat>) {
    makeAutoObservable(this, {
      // readonly properties do not need to be observed
      description: false,
      methodology: false,
      name: false,
      tenantId: false,
    });

    // initialize metadata
    this.name = name;
    this.description = description;
    this.methodology = methodology;

    // initialize data fetching
    this.tenantId = tenantId;
    this.dataTransformer = dataTransformer;
    this.sourceFileName = sourceFileName;
  }

  async fetch(): Promise<void> {
    this.isLoading = true;
    const apiResponse = await fetchMetrics({
      metricNames: [this.sourceFileName],
      tenantId: this.tenantId,
    });
    runInAction(() => {
      if (apiResponse) {
        const metricFileData = apiResponse[this.sourceFileName];
        if (metricFileData) {
          this.allRecords = this.dataTransformer(metricFileData);
        }
        this.isLoading = false;
      }
    });
  }

  get records(): RecordFormat[] | undefined {
    return this.allRecords;
  }
}

type MetricMappingFactoryOptions = {
  metadataMapping: TenantContent["metrics"];
  tenantId: TenantId;
};
/**
 * Factory function for converting a mapping of content objects by metric ID
 * to a mapping of Metric instances by metric ID. Creating the entire mapping at once
 * ensures that each ID maps to the proper Metric type without requiring further
 * type guarding on the part of consumers.
 */
export function createMetricMapping({
  metadataMapping,
  tenantId,
}: MetricMappingFactoryOptions): MetricMapping {
  const metricMapping: MetricMapping = {};

  // to maintain type safety we iterate through all of the known metrics;
  // iterating through the metadata object's keys widens the type to `string`,
  // which prevents us from guaranteeing exhaustiveness at the type level
  MetricTypeIdList.forEach((metricType) => {
    // not all metrics are required; metadata object is the source of truth
    // for which metrics to include
    const metadata = metadataMapping[metricType];
    if (!metadata) {
      return;
    }
    // this big ol' switch statement ensures that the type ID string union is properly narrowed,
    // allowing for 1:1 correspondence between the ID and the typed Metric instance.
    switch (metricType) {
      case "SentencePopulationCurrent":
        metricMapping[metricType] = new Metric<
          PopulationBreakdownByLocationRecord
        >({
          ...metadata,
          tenantId,
          dataTransformer: sentencePopulationCurrent,
          sourceFileName: "sentence_type_by_district_by_demographics",
        });
        break;
      case "SentenceTypesCurrent":
        metricMapping[metricType] = new Metric<SentenceTypeByLocationRecord>({
          ...metadata,
          tenantId,
          dataTransformer: sentenceTypesCurrent,
          sourceFileName: "sentence_type_by_district_by_demographics",
        });
        break;
      case "PrisonPopulationCurrent":
        metricMapping[metricType] = new Metric<
          PopulationBreakdownByLocationRecord
        >({
          ...metadata,
          tenantId,
          dataTransformer: prisonPopulationCurrent,
          sourceFileName:
            "incarceration_population_by_facility_by_demographics",
        });
        break;
      case "ProbationPopulationCurrent":
        metricMapping[metricType] = new Metric<
          PopulationBreakdownByLocationRecord
        >({
          ...metadata,
          tenantId,
          dataTransformer: probationPopulationCurrent,
          sourceFileName: "supervision_population_by_district_by_demographics",
        });
        break;
      case "ParolePopulationCurrent":
        metricMapping[metricType] = new Metric<
          PopulationBreakdownByLocationRecord
        >({
          ...metadata,
          tenantId,
          dataTransformer: parolePopulationCurrent,
          sourceFileName: "supervision_population_by_district_by_demographics",
        });
        break;
      case "PrisonPopulationHistorical":
        metricMapping[metricType] = new Metric<
          HistoricalPopulationBreakdownRecord
        >({
          ...metadata,
          tenantId,
          dataTransformer: prisonPopulationHistorical,
          sourceFileName: "incarceration_population_by_month_by_demographics",
        });
        break;
      case "ProbationPopulationHistorical":
        metricMapping[metricType] = new Metric<
          HistoricalPopulationBreakdownRecord
        >({
          ...metadata,
          tenantId,
          dataTransformer: probationPopulationHistorical,
          sourceFileName: "supervision_population_by_month_by_demographics",
        });
        break;
      case "ParolePopulationHistorical":
        metricMapping[metricType] = new Metric<
          HistoricalPopulationBreakdownRecord
        >({
          ...metadata,
          tenantId,
          dataTransformer: parolePopulationHistorical,
          sourceFileName: "supervision_population_by_month_by_demographics",
        });
        break;
      case "ProbationProgrammingCurrent":
        metricMapping[metricType] = new Metric<
          ProgramParticipationCurrentRecord
        >({
          ...metadata,
          tenantId,
          dataTransformer: probationProgramParticipationCurrent,
          sourceFileName: "active_program_participation_by_region",
        });
        break;
      case "ParoleProgrammingCurrent":
        metricMapping[metricType] = new Metric<
          ProgramParticipationCurrentRecord
        >({
          ...metadata,
          tenantId,
          dataTransformer: paroleProgramParticipationCurrent,
          sourceFileName: "active_program_participation_by_region",
        });
        break;
      case "ProbationSuccessHistorical":
        metricMapping[metricType] = new Metric<
          SupervisionSuccessRateMonthlyRecord
        >({
          ...metadata,
          tenantId,
          dataTransformer: probationSuccessRateMonthly,
          sourceFileName: "supervision_success_by_month",
        });
        break;
      case "ParoleSuccessHistorical":
        metricMapping[metricType] = new Metric<
          SupervisionSuccessRateMonthlyRecord
        >({
          ...metadata,
          tenantId,
          dataTransformer: paroleSuccessRateMonthly,
          sourceFileName: "supervision_success_by_month",
        });
        break;
      case "ProbationSuccessAggregate":
        metricMapping[metricType] = new Metric<
          SupervisionSuccessRateDemographicsRecord
        >({
          ...metadata,
          tenantId,
          dataTransformer: probationSuccessRateDemographics,
          sourceFileName: "supervision_success_by_period_by_demographics",
        });
        break;
      case "ParoleSuccessAggregate":
        metricMapping[metricType] = new Metric<
          SupervisionSuccessRateDemographicsRecord
        >({
          ...metadata,
          tenantId,
          dataTransformer: paroleSuccessRateDemographics,
          sourceFileName: "supervision_success_by_period_by_demographics",
        });
        break;
      case "ProbationRevocationsAggregate":
        metricMapping[metricType] = new Metric<DemographicsByCategoryRecord>({
          ...metadata,
          tenantId,
          dataTransformer: probationRevocationReasons,
          sourceFileName:
            "supervision_revocations_by_period_by_type_by_demographics",
        });
        break;
      case "ParoleRevocationsAggregate":
        metricMapping[metricType] = new Metric<DemographicsByCategoryRecord>({
          ...metadata,
          tenantId,
          dataTransformer: paroleRevocationReasons,
          sourceFileName:
            "supervision_revocations_by_period_by_type_by_demographics",
        });
        break;
      case "PrisonAdmissionReasonsCurrent":
        metricMapping[metricType] = new Metric<DemographicsByCategoryRecord>({
          ...metadata,
          tenantId,
          dataTransformer: prisonAdmissionReasons,
          sourceFileName: "incarceration_population_by_admission_reason",
        });
        break;
      case "PrisonReleaseTypeAggregate":
        metricMapping[metricType] = new Metric<DemographicsByCategoryRecord>({
          ...metadata,
          tenantId,
          dataTransformer: prisonReleaseTypes,
          sourceFileName: "incarceration_releases_by_type_by_period",
        });
        break;
      case "PrisonRecidivismRateHistorical":
        metricMapping[metricType] = new Metric<RecidivismRateRecord>({
          ...metadata,
          tenantId,
          dataTransformer: recidivismRateAllFollowup,
          sourceFileName: "recidivism_rates_by_cohort_by_year",
        });
        break;
      case "PrisonRecidivismRateSingleFollowupHistorical":
        metricMapping[metricType] = new Metric<RecidivismRateRecord>({
          ...metadata,
          tenantId,
          dataTransformer: recidivismRateConventionalFollowup,
          sourceFileName: "recidivism_rates_by_cohort_by_year",
        });
        break;
      case "PrisonStayLengthAggregate":
        metricMapping[metricType] = new Metric<DemographicsByCategoryRecord>({
          ...metadata,
          tenantId,
          dataTransformer: prisonStayLengths,
          sourceFileName: "incarceration_lengths_by_demographics",
        });
        break;
      default:
        assertNever(metricType);
    }
  });

  return metricMapping;
}
