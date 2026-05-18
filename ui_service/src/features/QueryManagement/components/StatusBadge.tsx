import { Badge } from "@chakra-ui/react";

interface StatusBadgeProps {
    status: 'Success' | 'Partial' | 'Failed' | 'Running';
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
    const getStatusStyles = () => {
        switch (status) {
            case 'Success':
                return { bg: 'green.200', color: 'green' };
            case 'Partial':
                return { bg: 'yellow.200', color: 'gray' };
            case 'Failed':
                return { bg: 'red.500', color: 'white' };
            case 'Running':
                return { bg: 'blue.500', color: 'white' };
            default:
                return { bg: 'gray.100', color: 'gray.700' };
        }
    };

    return (
        <Badge
            fontSize="sm"
            px={2}
            py={1}
            borderRadius="md"
            {...getStatusStyles()}
        >
            {status}
        </Badge>
    );
};