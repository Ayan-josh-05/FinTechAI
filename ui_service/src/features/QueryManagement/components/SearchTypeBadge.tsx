import { Badge } from "@chakra-ui/react";

interface SearchTypeBadgeProps {
    type: string;
}

export const SearchTypeBadge = ({ type }: SearchTypeBadgeProps) => {
    const getTypeStyles = () => {
        switch (type.toLowerCase()) {
            case 'address search':
                return { bg: 'blue.50', color: 'blue.600' };
            case 'aadhar search':
                return { bg: 'orange.50', color: 'orange.600' };
            case 'pan search':
                return { bg: 'blue.50', color: 'blue.600' };
            case 'section-wise':
                return { bg: 'purple.50', color: 'purple.600' };
            case 'case no search':
                return { bg: 'red.50', color: 'red.600' };
            default:
                return { bg: 'gray.50', color: 'gray.600' };
        }
    };

    return (
        <Badge
            fontSize="sm"
            px={2}
            py={1}
            borderRadius="sm"
            fontWeight="medium"
            {...getTypeStyles()}
        >
            {type}
        </Badge>
    );
};