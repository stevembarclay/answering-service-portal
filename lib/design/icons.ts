/**
 * Icon Registry
 *
 * Single source of truth for all icons in the app.
 * To switch icon libraries: update the imports in THIS FILE ONLY.
 * All components import from here, never directly from 'lucide-react'.
 *
 * Current library: Lucide React
 * To switch: remap each export to the equivalent in the new library.
 *
 * Usage:
 *   import { IconCheck, IconWarning } from '@/lib/design/icons'
 *   <IconCheck size={iconSizes.md} className={statusColors.success.icon} />
 */

// ─── Status & Feedback ──────────────────────────────────────────────────────

export { CheckCircle2 as IconCheck }       from 'lucide-react'  // Primary success/approved
export { CheckCircle as IconCheckOutline } from 'lucide-react'  // Secondary check (outline style)
export { Check as IconCheckmark }          from 'lucide-react'  // Minimal checkmark (in buttons, badges)
export { CheckSquare as IconCheckSquare }  from 'lucide-react'  // Checkbox-style check
export { AlertTriangle as IconWarning }    from 'lucide-react'  // Warning / stale / expiring
export { AlertCircle as IconAlert }        from 'lucide-react'  // Alert / attention required
export { XCircle as IconError }            from 'lucide-react'  // Error / failed / blocked
export { X as IconClose }                  from 'lucide-react'  // Close / dismiss / remove
export { Info as IconInfo }                from 'lucide-react'  // Informational
export { Flag as IconFlag }                from 'lucide-react'  // Flagged / detected
export { Circle as IconCircle }            from 'lucide-react'  // Empty / placeholder dot
export { TriangleAlert as IconTriangle }   from 'lucide-react'  // Alternate warning

// ─── Navigation & Direction ─────────────────────────────────────────────────

export { ArrowRight as IconArrowRight }    from 'lucide-react'
export { ArrowLeft as IconArrowLeft }      from 'lucide-react'
export { ArrowDown as IconArrowDown }      from 'lucide-react'
export { ArrowUpDown as IconSort }         from 'lucide-react'  // Sortable columns
export { ChevronDown as IconChevronDown }  from 'lucide-react'  // Accordions, dropdowns
export { ChevronUp as IconChevronUp }      from 'lucide-react'
export { ChevronRight as IconChevronRight } from 'lucide-react'
export { ChevronLeft as IconChevronLeft }  from 'lucide-react'
export { ExternalLink as IconExternal }    from 'lucide-react'  // Opens in new tab

// ─── Documents & Files ──────────────────────────────────────────────────────

export { FileText as IconDocument }        from 'lucide-react'  // Generic document
export { FileCheck as IconFileApproved }   from 'lucide-react'  // Approved document
export { FileSearch as IconFileSearch }    from 'lucide-react'  // Search in document
export { FileDown as IconFileDownload }    from 'lucide-react'  // Download file
export { FileUp as IconFileUpload }        from 'lucide-react'  // Upload file
export { FileImage as IconFileImage }      from 'lucide-react'  // Image file
export { FileBarChart as IconFileChart }   from 'lucide-react'  // Chart/data file
export { FileSpreadsheet as IconFileData } from 'lucide-react'  // Spreadsheet / data file
export { FileArchive as IconFileArchive }  from 'lucide-react'  // Archived file
export { FileQuestion as IconFileUnknown } from 'lucide-react'  // Unknown file type
export { FileType as IconFileType }        from 'lucide-react'  // File type indicator
export { Hash as IconHash }                from 'lucide-react'  // Hash / SHA-256 identifier
export { Archive as IconArchive }          from 'lucide-react'  // Archived state
export { Paperclip as IconAttachment }     from 'lucide-react'  // Attachment / linked file

// ─── Folders & Storage ──────────────────────────────────────────────────────

export { FolderOpen as IconFolderOpen }    from 'lucide-react'  // Open folder
export { FolderArchive as IconFolderArchive } from 'lucide-react'
export { FolderSync as IconFolderSync }    from 'lucide-react'

// ─── Actions ────────────────────────────────────────────────────────────────

export { Upload as IconUpload }            from 'lucide-react'
export { Download as IconDownload }        from 'lucide-react'
export { Plus as IconAdd }                 from 'lucide-react'  // Add / create
export { Trash2 as IconDelete }            from 'lucide-react'  // Delete / remove
export { Edit as IconEdit }                from 'lucide-react'  // Edit (pencil)
export { Edit2 as IconEditAlt }            from 'lucide-react'  // Edit alternate style
export { Pencil as IconPencil }            from 'lucide-react'  // Pencil edit
export { Copy as IconCopy }                from 'lucide-react'  // Copy to clipboard
export { Search as IconSearch }            from 'lucide-react'
export { Filter as IconFilter }            from 'lucide-react'
export { RefreshCw as IconRefresh }        from 'lucide-react'  // Refresh / retry / sync
export { RotateCcw as IconUndo }           from 'lucide-react'  // Undo / reset
export { Save as IconSave }                from 'lucide-react'
export { Send as IconSend }                from 'lucide-react'
export { SendHorizontal as IconSendAlt }   from 'lucide-react'
export { Share2 as IconShare }             from 'lucide-react'
export { Printer as IconPrint }            from 'lucide-react'
export { Play as IconPlay }                from 'lucide-react'
export { Link as IconLink }                from 'lucide-react'  // Link / connect
export { Link2 as IconLinkAlt }            from 'lucide-react'  // Link alternate style
export { Unlink as IconUnlink }            from 'lucide-react'  // Unlink / disconnect
export { MousePointerClick as IconClick }  from 'lucide-react'  // Interactive / clickable

// ─── Data & Analytics ───────────────────────────────────────────────────────

export { BarChart3 as IconBarChart }       from 'lucide-react'
export { TrendingUp as IconTrendingUp }    from 'lucide-react'
export { TrendingDown as IconTrendingDown } from 'lucide-react'
export { Target as IconTarget }            from 'lucide-react'
export { Database as IconDatabase }        from 'lucide-react'
export { DollarSign as IconDollar }        from 'lucide-react'
export { SlidersHorizontal as IconSliders } from 'lucide-react' // Controls / settings
export { Layers as IconLayers }            from 'lucide-react'  // Multi-tier / stacked
export { Library as IconLibrary }          from 'lucide-react'  // Library / collection
export { Activity as IconActivity }        from 'lucide-react'  // Activity log / health
export { Network as IconNetworkGraph }     from 'lucide-react'  // Graph / connections
export { Blocks as IconBlocks }            from 'lucide-react'  // Module blocks / admin
export { Square as IconSquare }            from 'lucide-react'  // Square / placeholder / status dot
export { Image as IconImage }              from 'lucide-react'  // Image file / photo upload
export { Scale as IconScale }              from 'lucide-react'  // Legal / compliance / balance
export { LayoutDashboard as IconDashboard } from 'lucide-react' // Dashboard / home nav
export { BookMarked as IconBookmark }      from 'lucide-react'  // Bookmarked / saved
export { Compass as IconCompass }          from 'lucide-react'  // Navigation / explore
export { ClipboardCheck as IconClipboardCheck } from 'lucide-react' // Checklist approved
export { Scan as IconScan }                from 'lucide-react'  // Scan / detection
export { FlaskConical as IconFlask }       from 'lucide-react'  // Lab / testing
export { Globe as IconGlobe }              from 'lucide-react'  // Public / global / web

// ─── Time & Calendar ────────────────────────────────────────────────────────

export { Clock as IconClock }              from 'lucide-react'  // Time / duration / pending
export { Clock3 as IconClockAlt }          from 'lucide-react'  // Clock alternate
export { Calendar as IconCalendar }        from 'lucide-react'
export { CalendarClock as IconDeadline }   from 'lucide-react'  // Deadline / scheduled

// ─── Security & Compliance ──────────────────────────────────────────────────

export { Shield as IconShield }            from 'lucide-react'  // Protected / secure
export { ShieldCheck as IconShieldCheck }  from 'lucide-react'  // Verified / compliant
export { Lock as IconLock }                from 'lucide-react'  // Locked / immutable

// ─── Users & Organization ───────────────────────────────────────────────────

export { User as IconUser }                from 'lucide-react'
export { Users as IconTeam }               from 'lucide-react'
export { UserCheck as IconUserApproved }   from 'lucide-react'  // Approved user / verified
export { UserPlus as IconUserAdd }         from 'lucide-react'  // Invite / add user
export { UserX as IconUserRemove }         from 'lucide-react'  // Remove user
export { Building2 as IconFirm }           from 'lucide-react'  // Firm / organization
export { Building as IconBuilding }        from 'lucide-react'  // Building alternate
export { Megaphone as IconAnnounce }       from 'lucide-react'  // Marketing / announcement

// ─── UI & Navigation Structure ──────────────────────────────────────────────

export { Menu as IconMenu }                from 'lucide-react'  // Hamburger menu
export { MoreHorizontal as IconMore }      from 'lucide-react'  // "..." overflow menu
export { MoreVertical as IconMoreVert }    from 'lucide-react'  // Vertical overflow
export { Settings as IconSettings }        from 'lucide-react'
export { Eye as IconView }                 from 'lucide-react'  // View / preview
export { Home as IconHome }                from 'lucide-react'
export { Layout as IconLayout }            from 'lucide-react'
export { LayoutGrid as IconGrid }          from 'lucide-react'
export { LogIn as IconLogin }              from 'lucide-react'
export { LogOut as IconLogout }            from 'lucide-react'
export { Bell as IconBell }                from 'lucide-react'  // Notifications
export { Power as IconPower }              from 'lucide-react'

// ─── Content & Communication ────────────────────────────────────────────────

export { MessageSquare as IconComment }    from 'lucide-react'  // Comment / note
export { MessageCircle as IconMessage }    from 'lucide-react'  // Message / chat
export { MessageCircleQuestion as IconQuestion } from 'lucide-react' // Ask / question
export { BookOpen as IconBook }            from 'lucide-react'  // Guide / documentation
export { Mail as IconEmail }               from 'lucide-react'

// ─── Text Formatting ────────────────────────────────────────────────────────

export { Bold as IconBold }                from 'lucide-react'
export { Italic as IconItalic }            from 'lucide-react'
export { List as IconList }                from 'lucide-react'
export { ListChecks as IconChecklist }     from 'lucide-react'
export { ListOrdered as IconListOrdered }  from 'lucide-react'

// ─── Learning & Achievements ────────────────────────────────────────────────

export { GraduationCap as IconGraduate }   from 'lucide-react'  // Course / training complete
export { Award as IconAward }              from 'lucide-react'  // Certificate / achievement
export { Brain as IconBrain }              from 'lucide-react'  // AI / smart / learning

// ─── Technical ──────────────────────────────────────────────────────────────

export { GitBranch as IconBranch }         from 'lucide-react'  // Pipeline branching
export { GitCompare as IconCompare }       from 'lucide-react'  // Diff / comparison
export { TestTube2 as IconTestTube }       from 'lucide-react'  // Validation / testing
export { Sparkles as IconSparkles }        from 'lucide-react'  // AI / automated
export { Zap as IconZap }                  from 'lucide-react'  // Fast / automated
export { Package as IconPackage }          from 'lucide-react'
export { Rocket as IconRocket }            from 'lucide-react'
export { Briefcase as IconBriefcase }      from 'lucide-react'
export { Heart as IconHeart }              from 'lucide-react'

// ─── Additional ─────────────────────────────────────────────────────────────

export { History as IconHistory }          from 'lucide-react'  // Version history / changelog
export { FileX as IconFileRemoved }        from 'lucide-react'  // File removed / rejected
export { UserMinus as IconUserDeactivate } from 'lucide-react'  // Remove / deactivate user
export { UserCog as IconUserManage }       from 'lucide-react'  // Manage user settings
export { CheckCheck as IconCheckAll }      from 'lucide-react'  // All checked / read-all
export { Ban as IconBan }                  from 'lucide-react'  // Banned / blocked
export { HelpCircle as IconHelp }          from 'lucide-react'  // Help / unknown answer state

// ─── Loading ────────────────────────────────────────────────────────────────

export { Loader2 as IconSpinner }          from 'lucide-react'  // Action loading only (buttons)
// NOTE: Use loadingStates.skeleton from motion-system.ts for CONTENT loading

// ─── Type export (for typing icon props) ────────────────────────────────────

export type { LucideIcon as IconComponent } from 'lucide-react'
export type { LucideProps as IconProps }    from 'lucide-react'
