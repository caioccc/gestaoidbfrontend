import React from 'react';
import { Badge, Group, Tooltip } from '@mantine/core';
import { IconAlertTriangle, IconInfoCircle } from '@tabler/icons-react';
import { useLanguage } from '../i18n';
import type { RegistrationAnalysis, RegistrationIssue } from '../types';

interface RegistrationAnalysisBadgesProps {
  analysis?: RegistrationAnalysis | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const HIDDEN_ANALYSIS_CODES = new Set([
  'father_not_registered',
  'mother_not_registered',
  'father_without_registration',
  'mother_without_registration',
]);

const labelForField = (
  field: string,
  labels: Record<string, string>
): string => labels[field] ?? field;

const issueDetail = (
  issue: RegistrationIssue,
  t: ReturnType<typeof useLanguage>['t']
): string => {
  const details: string[] = [];
  const labels = t.analysis.label as Record<string, string>;

  if (issue.matches?.length) {
    const names = issue.matches
      .map((match) =>
        match.card_number
          ? `${match.name} (${match.card_number})`
          : match.name
      )
      .join(', ');
    details.push(t.analysis.duplicateWith.replace('{names}', names));
  }

  if (issue.code === 'missing_fields' && issue.fields?.length) {
    const fields = issue.fields
      .map((field) => labelForField(field, labels))
      .join(', ');
    details.push(t.analysis.missingFields.replace('{fields}', fields));
  }

  if (issue.names?.length) {
    details.push(t.analysis.notRegistered.replace('{names}', issue.names.join(', ')));
  }

  if (!details.length && issue.fields?.length) {
    details.push(
      issue.fields.map((field) => labelForField(field, labels)).join(', ')
    );
  }

  return [t.analysis.informational, ...details].join(' ');
};

export default function RegistrationAnalysisBadges({
  analysis,
  size = 'xs',
}: RegistrationAnalysisBadgesProps) {
  const { t } = useLanguage();
  const visibleIssues = (analysis?.issues ?? []).filter(
    (issue) => !HIDDEN_ANALYSIS_CODES.has(issue.code),
  );
  if (!visibleIssues.length) return null;

  return (
    <Group gap={4} wrap="wrap">
      {visibleIssues.map((issue, index) => {
        const critical = issue.severity === 'critical';
        const Icon = critical ? IconAlertTriangle : IconInfoCircle;
        return (
          <Tooltip
            key={`${issue.code}-${index}`}
            label={issueDetail(issue, t)}
            withArrow
            multiline
            w={280}
          >
            <Badge
              variant="light"
              color={critical ? 'red' : 'orange'}
              size={size}
              data-testid={`analysis-${issue.code}`}
            >
              <Icon
                size={12}
                style={{ marginRight: 4, verticalAlign: 'text-bottom' }}
              />
              {t.analysis.code[issue.code]}
            </Badge>
          </Tooltip>
        );
      })}
    </Group>
  );
}
