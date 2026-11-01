export interface BottomNavItem {
  id: string;
  label: string;
  href: string;
}

export interface BottomNavProps {
  items: readonly BottomNavItem[];
  activeId: string;
  label: string;
}
