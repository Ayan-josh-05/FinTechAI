import { FaSearch } from 'react-icons/fa'
import {
  FaGavel,
  FaRegCircleCheck,
  FaRegCommentDots,
  FaUserPlus,
} from 'react-icons/fa6'
import { MdWarning } from 'react-icons/md'
import type { IconType } from 'react-icons/lib'

// Grid configuration
export const GRID_CONFIG = { base: '1fr', md: 'repeat(2, 1fr)' } as const

// Interfaces
export interface ActionCardData {
  icon: IconType
  title: string
  description: string
  buttonText: string
  onClick: () => void
  iconBackground?: string
  iconBorderColor?: string
  iconColor?: string
  buttonColor?: string
  buttonHoverColor?: string
}

export interface MetricCardData {
  title: string
  value: string
  change: string
  badge: string
  progress: number
  progressLabel: string
  color: 'green' | 'blue' | 'red' | 'yellow'
  progressValue?: string
}

export interface ActivityItemData {
  icon: IconType
  title: string
  description: string
  time: string
  iconColor: 'success' | 'info' | 'warning' | 'error'
}

// Action cards data array
export const ACTION_CARDS: Array<ActionCardData> = [
  {
    icon: FaSearch,
    title: 'Legal Data Discovery',
    description:
      'Search through case documents and legal precedents using AI-powered tools',
    buttonText: 'Explore Data',
    onClick: () => console.log('Explore Data clicked'),
    iconBackground: 'blue.50',
    iconBorderColor: 'blue.200',
    iconColor: '#3B82F6',
    buttonColor: 'blue.500',
    buttonHoverColor: 'blue.700',
  },
  {
    icon: FaUserPlus,
    title: 'Advanced Search',
    description:
      'Find specific case details, documents, and legal citations with precision',
    buttonText: 'Search Now',
    onClick: () => console.log('Search Now clicked'),
    iconBackground: 'gray.100',
    iconBorderColor: 'gray.300',
    iconColor: '#6B7280',
    buttonColor: 'gray.600',
    buttonHoverColor: 'gray.800',
  },
]

// Metrics data array - temporarily hidden Open Cases and Reviewed Documents cards
export const METRICS_DATA: Array<MetricCardData> = [
  // {
  //   title: 'Open Cases',
  //   value: '12',
  //   change: '8%',
  //   badge: '+2 NEW',
  //   progress: 75,
  //   progressLabel: 'Progress',
  //   color: 'green',
  // },
  // {
  //   title: 'Reviewed Documents',
  //   value: '247',
  //   change: '12%',
  //   progress: 65,
  //   badge: 'This Week',
  //   progressLabel: 'Target',
  //   progressValue: '247/380',
  //   color: 'blue',
  // },
]

// Activity items data array
export const ACTIVITY_ITEMS: Array<ActivityItemData> = [
  {
    icon: FaRegCircleCheck,
    title: 'Contract Review Completed',
    description: 'Smith vs. Johnson case',
    time: 'Today, 10:30 AM',
    iconColor: 'success',
  },
  {
    icon: FaGavel,
    title: 'Court Hearing Scheduled',
    description: 'Corporate Acquisition Case',
    time: 'Yesterday, 2:15 PM',
    iconColor: 'info',
  },
  {
    icon: FaRegCommentDots,
    title: 'Client Meeting Notes Added',
    description: 'Intellectual Property Dispute',
    time: 'Aug 3, 4:45 PM',
    iconColor: 'info',
  },
  {
    icon: MdWarning,
    title: 'Deadline Approaching',
    description: 'File Response in Jones Case',
    time: 'Aug 2, 9:20 AM',
    iconColor: 'warning',
  },
]
