import { useState, useEffect, useRef } from 'react';
import { GlassCard, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Checkbox } from '@/components/ui/checkbox';
import { accountService, settingsService, Income, Expense, PendingExpense, BankDeposit } from '@/lib/storage';
import { Trash2, Download, Pencil, ChevronUp, ChevronDown, FileText, Check, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface AutocompleteProps {
  value: string;
  onChange: (val: string) => void;
  suggestions: string[];
  placeholder?: string;
  className?: string;
}

const Autocomplete = ({ value, onChange, suggestions, placeholder = "Type to search...", className = "" }: AutocompleteProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const cleanSuggestions = Array.from(
    new Set(
      suggestions
        .filter(s => s !== undefined && s !== null && s !== '')
        .map(String)
    )
  );

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && activeIndex >= 0 && listRef.current) {
      const activeElement = listRef.current.children[activeIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex, isOpen]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    setActiveIndex(-1);
    if (val.trim().length >= 1) {
      const filtered = cleanSuggestions.filter(s =>
        s.toLowerCase().includes(val.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setIsOpen(true);
    } else {
      setFilteredSuggestions(cleanSuggestions);
      setIsOpen(true);
    }
  };

  const handleOpenDropdown = () => {
    setActiveIndex(-1);
    if (value.trim().length >= 1) {
      const filtered = cleanSuggestions.filter(s =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredSuggestions(filtered.length > 0 ? filtered : cleanSuggestions);
      setIsOpen(true);
    } else {
      setFilteredSuggestions(cleanSuggestions);
      setIsOpen(true);
    }
  };

  const selectSuggestion = (suggestion: string) => {
    onChange(suggestion);
    setIsOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen) {
      if ((e.key === "ArrowDown" || e.key === "ArrowUp") && cleanSuggestions.length > 0) {
        const filtered = value.trim().length >= 1
          ? cleanSuggestions.filter(s => s.toLowerCase().includes(value.toLowerCase()))
          : cleanSuggestions;
        if (filtered.length > 0) {
          e.preventDefault();
          setFilteredSuggestions(filtered);
          setIsOpen(true);
          setActiveIndex(e.key === "ArrowDown" ? 0 : filtered.length - 1);
        }
      }
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex(prev => (prev < filteredSuggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex(prev => (prev > 0 ? prev - 1 : filteredSuggestions.length - 1));
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < filteredSuggestions.length) {
        e.preventDefault();
        selectSuggestion(filteredSuggestions[activeIndex]);
      } else {
        setIsOpen(false);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      setIsOpen(false);
      setActiveIndex(-1);
    } else if (e.key === "Tab") {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <Input
        type="text"
        value={value}
        onChange={handleInputChange}
        onFocus={handleOpenDropdown}
        onClick={handleOpenDropdown}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-background border border-input rounded-md shadow-sm h-10 pr-8"
      />
      <div
        onClick={() => {
          if (!isOpen) {
            handleOpenDropdown();
          } else {
            setIsOpen(false);
          }
        }}
        className="absolute right-2 top-1/2 -translate-y-1/2 cursor-pointer p-1 text-muted-foreground hover:text-foreground"
      >
        <ChevronDown className="w-4 h-4" />
      </div>
      {isOpen && filteredSuggestions.length > 0 && (
        <div ref={listRef} className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-60 overflow-auto">
          {filteredSuggestions.map((s, idx) => (
            <div
              key={idx}
              onClick={() => selectSuggestion(s)}
              onMouseEnter={() => setActiveIndex(idx)}
              className={`px-3 py-2 text-sm cursor-pointer text-left transition-colors ${
                idx === activeIndex
                  ? "bg-accent text-accent-foreground font-medium"
                  : "hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {s}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminAccountsPage = () => {
  const { toast } = useToast();
  
  // Settings State
  const [clients, setClients] = useState<string[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<string[]>([]);
  const [banks, setBanks] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  // Settings Inputs
  const [newClient, setNewClient] = useState('');
  const [newPaymentMethod, setNewPaymentMethod] = useState('');
  const [newBank, setNewBank] = useState('');
  const [newCategory, setNewCategory] = useState('');
  
  const [editingSetting, setEditingSetting] = useState<{ key: string, oldValue: string, newValue: string } | null>(null);

  // Data State
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pendingExpenses, setPendingExpenses] = useState<PendingExpense[]>([]);
  const [bankDeposits, setBankDeposits] = useState<BankDeposit[]>([]);

  // Income Form State
  const [incomeForm, setIncomeForm] = useState({ date: '', clientName: '', category: '', paymentMethod: '', bank: '', amount: '', remarks: '', invoicePrefix: 'INV', invoiceNumber: '', rfNo: '', chequeNo: '', isGst: false });
  
  // Expense Form State
  const [expenseForm, setExpenseForm] = useState({ date: '', category: '', bank: '', clientName: '', paymentMethod: '', amount: '', remarks: '', rfNo: '', isGst: false });

  // Bank Deposit Form State
  const [bankDepositForm, setBankDepositForm] = useState({ date: '', type: 'Cash', bank: '', amount: '', chequeNo: '', bankName: '', remarks: '' });

  // Input Refs for Settings
  const clientInputRef = useRef<HTMLInputElement>(null);
  const paymentMethodInputRef = useRef<HTMLInputElement>(null);
  const bankInputRef = useRef<HTMLInputElement>(null);
  const categoryInputRef = useRef<HTMLInputElement>(null);

  // PDF Preview State
  const [pdfPreviewData, setPdfPreviewData] = useState<{ title: string, headers: string[], tableData: any[][] } | null>(null);

  // Date Formatter
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1]}-${parts[0]}`;
    }
    return dateStr;
  };

  // Edit Modals State
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [editingPendingExpense, setEditingPendingExpense] = useState<PendingExpense | null>(null);
  const [editingBankDeposit, setEditingBankDeposit] = useState<BankDeposit | null>(null);

  // Form Collapse States
  const [showIncomeForm, setShowIncomeForm] = useState(true);
  const [showExpenseForm, setShowExpenseForm] = useState(true);
  const [showBankDepositForm, setShowBankDepositForm] = useState(true);

  // Filters
  const [incomeFilters, setIncomeFilters] = useState({ clientName: 'All', category: 'All', paymentMethod: 'All', bank: 'All', month: 'All', year: 'All', invoiceNumber: '', startDate: '', endDate: '' });
  const [expenseFilters, setExpenseFilters] = useState({ category: 'All', clientName: 'All', month: 'All', year: 'All', startDate: '', endDate: '' });
  const [adExpenseFilters, setAdExpenseFilters] = useState({ clientName: 'All', month: 'All', year: 'All' });
  const [bankDepositFilters, setBankDepositFilters] = useState({ type: 'All', month: 'All', year: 'All', startDate: '', endDate: '' });
  const [overviewFilters, setOverviewFilters] = useState({ month: 'All', year: 'All' });
  const [ledgerFilters, setLedgerFilters] = useState({ clientName: 'All', month: 'All', year: 'All' });

  const loadData = async () => {
    try {
      const [
        clientsData, methodsData, banksData, categoriesData,
        incomesData, expensesData, bankDepositsData, pendingExpensesData
      ] = await Promise.all([
        settingsService.get('accountClients'),
        settingsService.get('accountPaymentMethods'),
        settingsService.get('accountBanks'),
        settingsService.get('accountCategories'),
        accountService.getIncomes(),
        accountService.getExpenses(),
        accountService.getBankDeposits(),
        accountService.getPendingExpenses()
      ]);

      setClients(clientsData?.value || []);
      setPaymentMethods(methodsData?.value || []);
      setBanks(banksData?.value || []);
      
      const loadedCats = categoriesData?.value || [];
      const expCats = (expensesData || []).map(e => e.category).filter(Boolean);
      setCategories(Array.from(new Set(['Meta Ad', ...loadedCats, ...expCats])));
      
      setIncomes(incomesData || []);
      setExpenses(expensesData || []);
      setPendingExpenses(pendingExpensesData || []);
      setBankDeposits(bankDepositsData || []);
    } catch (error) {
      console.error('Failed to load accounts data', error);
      toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers for Settings
  const handleAddSetting = async (key: string, value: string, list: string[], setList: (val: string[]) => void, resetInput: () => void, inputRef?: React.RefObject<HTMLInputElement>) => {
    if (!value.trim() || list.includes(value.trim())) return;
    const newList = [...list, value.trim()];
    try {
      await settingsService.update(key, newList);
      setList(newList);
      resetInput();
      toast({ title: 'Added successfully' });
      if (inputRef && inputRef.current) {
        inputRef.current.focus();
      }
    } catch (e) {
      toast({ title: 'Error adding item', variant: 'destructive' });
    }
  };

  const handleRemoveSetting = async (key: string, valueToRemove: string, list: string[], setList: (val: string[]) => void) => {
    const newList = list.filter(item => item !== valueToRemove);
    try {
      await settingsService.update(key, newList);
      setList(newList);
      toast({ title: 'Removed successfully' });
    } catch (e) {
      toast({ title: 'Error removing item', variant: 'destructive' });
    }
  };

  const handleEditSetting = async (key: string, oldValue: string, newValue: string, list: string[], setList: (val: string[]) => void) => {
    if (!newValue.trim() || newValue.trim() === oldValue) return setEditingSetting(null);
    if (list.includes(newValue.trim())) {
      toast({ title: 'Item already exists', variant: 'destructive' });
      return;
    }
    const newList = list.map(item => item === oldValue ? newValue.trim() : item);
    try {
      await settingsService.update(key, newList);
      setList(newList);
      toast({ title: 'Updated successfully' });
      setEditingSetting(null);
    } catch (e) {
      toast({ title: 'Error updating item', variant: 'destructive' });
    }
  };

  // Handlers for Forms
  const handleAddIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeForm.date || !incomeForm.clientName || !incomeForm.paymentMethod || !incomeForm.bank || !incomeForm.amount) {
      return toast({ title: 'Please fill all fields', variant: 'destructive' });
    }

    const dateObj = new Date(incomeForm.date);
    const month = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear().toString();

    const amountVal = Number(incomeForm.amount);
    const withoutGstVal = incomeForm.isGst ? Number((amountVal / 1.18).toFixed(2)) : amountVal;
    const gstVal = incomeForm.isGst ? Number((amountVal - withoutGstVal).toFixed(2)) : 0;

    try {
      await accountService.createIncome({
        date: incomeForm.date,
        clientName: incomeForm.clientName,
        category: incomeForm.category,
        paymentMethod: incomeForm.paymentMethod,
        bank: incomeForm.bank,
        amount: amountVal,
        isGst: incomeForm.isGst,
        gstAmount: gstVal,
        withoutGstAmount: withoutGstVal,
        month,
        year,
        remarks: incomeForm.remarks,
        invoiceNumber: incomeForm.invoiceNumber.trim() ? `${incomeForm.invoicePrefix}-${incomeForm.invoiceNumber.trim().replace(/^(INV|PFI)-/i, '')}` : '',
        rfNo: incomeForm.rfNo || undefined,
        chequeNo: incomeForm.chequeNo.trim() || undefined
      });
      toast({ title: 'Income added successfully' });
      setIncomeForm({ date: '', clientName: '', category: '', paymentMethod: '', bank: '', amount: '', remarks: '', invoicePrefix: 'INV', invoiceNumber: '', rfNo: '', chequeNo: '', isGst: false });
      loadData();
    } catch (err) {
      toast({ title: 'Failed to add income', variant: 'destructive' });
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.date || !expenseForm.category || !expenseForm.amount) {
      return toast({ title: 'Please fill all fields', variant: 'destructive' });
    }

    const dateObj = new Date(expenseForm.date);
    const month = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear().toString();

    const amountVal = Number(expenseForm.amount);
    const withoutGstVal = expenseForm.isGst ? Number((amountVal / 1.18).toFixed(2)) : amountVal;
    const gstVal = expenseForm.isGst ? Number((amountVal - withoutGstVal).toFixed(2)) : 0;

    try {
      await accountService.createExpense({
        date: expenseForm.date,
        category: expenseForm.category,
        paymentMethod: expenseForm.paymentMethod || undefined,
        bank: expenseForm.bank,
        clientName: expenseForm.clientName || undefined,
        rfNo: expenseForm.rfNo || undefined,
        amount: amountVal,
        isGst: expenseForm.isGst,
        gstAmount: gstVal,
        withoutGstAmount: withoutGstVal,
        month,
        year,
        remarks: expenseForm.remarks
      });
      toast({ title: 'Expense added successfully' });
      setExpenseForm({ date: '', category: '', bank: '', clientName: '', paymentMethod: '', amount: '', remarks: '', rfNo: '', isGst: false });
      loadData();
    } catch (err) {
      toast({ title: 'Failed to add expense', variant: 'destructive' });
    }
  };

  const handleAddBankDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    const dateObj = new Date(bankDepositForm.date);
    const month = dateObj.toLocaleString('default', { month: 'long' });
    const year = dateObj.getFullYear().toString();

    try {
      await accountService.createBankDeposit({
        date: bankDepositForm.date,
        type: bankDepositForm.type as 'Cash' | 'Cheque',
        bank: bankDepositForm.bank,
        amount: Number(bankDepositForm.amount),
        chequeNo: bankDepositForm.chequeNo,
        bankName: bankDepositForm.bankName,
        month,
        year,
        remarks: bankDepositForm.remarks
      });
      toast({ title: 'Bank Deposit added successfully' });
      setBankDepositForm({ date: '', type: 'Cash', bank: '', amount: '', chequeNo: '', bankName: '', remarks: '' });
      loadData();
    } catch (err) {
      toast({ title: 'Failed to add bank deposit', variant: 'destructive' });
    }
  };

  const handleDeleteIncome = async (id: string) => {
    try {
      await accountService.deleteIncome(id);
      toast({ title: 'Deleted successfully' });
      loadData();
    } catch (err) {
      toast({ title: 'Error deleting', variant: 'destructive' });
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await accountService.deleteExpense(id);
      toast({ title: 'Deleted successfully' });
      loadData();
    } catch (err) {
      toast({ title: 'Error deleting', variant: 'destructive' });
    }
  };

  const handleDeleteBankDeposit = async (id: string) => {
    try {
      await accountService.deleteBankDeposit(id);
      toast({ title: 'Deleted successfully' });
      loadData();
    } catch (err) {
      toast({ title: 'Error deleting', variant: 'destructive' });
    }
  };

  const handleUpdateIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIncome) return;
    try {
      const amountVal = Number(editingIncome.amount);
      const withoutGstVal = editingIncome.isGst ? Number((amountVal / 1.18).toFixed(2)) : amountVal;
      const gstVal = editingIncome.isGst ? Number((amountVal - withoutGstVal).toFixed(2)) : 0;
      const updatedData = {
        ...editingIncome,
        amount: amountVal,
        gstAmount: gstVal,
        withoutGstAmount: withoutGstVal
      };
      await accountService.updateIncome(editingIncome.id, updatedData);
      toast({ title: 'Income updated successfully' });
      setEditingIncome(null);
      loadData();
    } catch (err) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;
    try {
      const amountVal = Number(editingExpense.amount);
      const withoutGstVal = editingExpense.isGst ? Number((amountVal / 1.18).toFixed(2)) : amountVal;
      const gstVal = editingExpense.isGst ? Number((amountVal - withoutGstVal).toFixed(2)) : 0;
      const updatedData = {
        ...editingExpense,
        amount: amountVal,
        gstAmount: gstVal,
        withoutGstAmount: withoutGstVal
      };
      await accountService.updateExpense(editingExpense.id, updatedData);
      toast({ title: 'Expense updated successfully' });
      setEditingExpense(null);
      loadData();
    } catch (err) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleUpdateBankDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBankDeposit) return;
    try {
      await accountService.updateBankDeposit(editingBankDeposit.id, editingBankDeposit);
      toast({ title: 'Bank Deposit updated successfully' });
      setEditingBankDeposit(null);
      loadData();
    } catch (err) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    }
  };

  const handleApproveAllPendingExpenses = async () => {
    if (pendingExpenses.length === 0) return;
    if (!confirm(`Are you sure you want to approve all ${pendingExpenses.length} pending expenses and move them to main expenses?`)) return;
    try {
      const result = await accountService.approveAllPendingExpenses();
      toast({ title: 'Success', description: `All ${result.count || pendingExpenses.length} pending expenses approved and moved to main expenses.` });
      loadData();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to approve pending expenses', variant: 'destructive' });
    }
  };

  const handleApprovePendingExpense = async (id: string) => {
    try {
      await accountService.approvePendingExpense(id);
      toast({ title: 'Success', description: 'Pending expense approved and moved to main accounts.' });
      loadData();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to approve pending expense', variant: 'destructive' });
    }
  };

  const handleDeletePendingExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this pending expense?')) return;
    try {
      await accountService.deletePendingExpense(id);
      toast({ title: 'Pending expense deleted successfully' });
      loadData();
    } catch (err) {
      toast({ title: 'Error', description: 'Failed to delete pending expense', variant: 'destructive' });
    }
  };

  const handleUpdatePendingExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPendingExpense) return;
    try {
      const amountVal = Number(editingPendingExpense.amount);
      const withoutGstVal = editingPendingExpense.isGst ? Number((amountVal / 1.18).toFixed(2)) : amountVal;
      const gstVal = editingPendingExpense.isGst ? Number((amountVal - withoutGstVal).toFixed(2)) : 0;

      const dateObj = new Date(editingPendingExpense.date);
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const month = !isNaN(dateObj.getMonth()) ? monthNames[dateObj.getMonth()] : editingPendingExpense.month;
      const year = !isNaN(dateObj.getFullYear()) ? dateObj.getFullYear().toString() : editingPendingExpense.year;

      await accountService.updatePendingExpense(editingPendingExpense.id, {
        ...editingPendingExpense,
        amount: amountVal,
        withoutGstAmount: withoutGstVal,
        gstAmount: gstVal,
        month,
        year
      });
      toast({ title: 'Pending expense updated successfully' });
      setEditingPendingExpense(null);
      loadData();
    } catch (err) {
      toast({ title: 'Failed to update pending expense', variant: 'destructive' });
    }
  };

  const getRecordMonth = (dateStr?: string, storedMonth?: string) => {
    if (storedMonth && storedMonth.trim()) return storedMonth.trim();
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.toLocaleString('default', { month: 'long' });
  };

  const getRecordYear = (dateStr?: string, storedYear?: string | number) => {
    if (storedYear && storedYear.toString().trim()) return storedYear.toString().trim();
    if (!dateStr) return '';
    const dateObj = new Date(dateStr);
    if (isNaN(dateObj.getTime())) return '';
    return dateObj.getFullYear().toString();
  };

  const isDateInRange = (dateStr: string, startStr: string, endStr: string) => {
    if (!startStr && !endStr) return true;
    if (!dateStr) return false;
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return false;
    if (startStr) {
      const start = new Date(`${startStr}T00:00:00`);
      if (date < start) return false;
    }
    if (endStr) {
      const end = new Date(`${endStr}T23:59:59.999`);
      if (date > end) return false;
    }
    return true;
  };

  const filteredIncomes = incomes.filter(inc => {
    const recMonth = getRecordMonth(inc.date, inc.month);
    const recYear = getRecordYear(inc.date, inc.year);
    const matchInvoice = !incomeFilters.invoiceNumber || (inc.invoiceNumber && inc.invoiceNumber.toLowerCase().includes(incomeFilters.invoiceNumber.toLowerCase()));
    const matchDateRange = isDateInRange(inc.date, incomeFilters.startDate, incomeFilters.endDate);
    const matchClient = incomeFilters.clientName === 'All' || !incomeFilters.clientName || (inc.clientName && inc.clientName.toLowerCase().includes(incomeFilters.clientName.toLowerCase()));
    const matchCategory = incomeFilters.category === 'All' || !incomeFilters.category || (inc.category && inc.category.toLowerCase().includes(incomeFilters.category.toLowerCase()));
    const matchPayment = incomeFilters.paymentMethod === 'All' || !incomeFilters.paymentMethod || (inc.paymentMethod && inc.paymentMethod.toLowerCase().includes(incomeFilters.paymentMethod.toLowerCase()));
    const matchBank = incomeFilters.bank === 'All' || !incomeFilters.bank || (inc.bank && inc.bank.toLowerCase().includes(incomeFilters.bank.toLowerCase()));
    const matchMonth = incomeFilters.month === 'All' || !incomeFilters.month || recMonth.toLowerCase() === incomeFilters.month.toLowerCase() || recMonth.toLowerCase().includes(incomeFilters.month.toLowerCase());
    const matchYear = incomeFilters.year === 'All' || !incomeFilters.year || recYear.toLowerCase() === incomeFilters.year.toString().toLowerCase() || recYear.toLowerCase().includes(incomeFilters.year.toString().toLowerCase());
    return matchDateRange && matchClient && matchCategory && matchPayment && matchBank && matchMonth && matchYear && matchInvoice;
  });

  const isMetaAd = (category?: string) => {
    if (!category) return false;
    const lower = category.toLowerCase().trim();
    return lower === 'meta ad' || lower === 'meta ads' || lower.includes('meta ad');
  };

  const filteredExpenses = expenses.filter(exp => {
    if (isMetaAd(exp.category)) return false;
    const recMonth = getRecordMonth(exp.date, exp.month);
    const recYear = getRecordYear(exp.date, exp.year);
    const matchDateRange = isDateInRange(exp.date, expenseFilters.startDate, expenseFilters.endDate);
    const matchCategory = expenseFilters.category === 'All' || !expenseFilters.category || (exp.category && exp.category.toLowerCase().includes(expenseFilters.category.toLowerCase()));
    const matchClient = expenseFilters.clientName === 'All' || !expenseFilters.clientName || (exp.clientName && exp.clientName.toLowerCase().includes(expenseFilters.clientName.toLowerCase()));
    const matchMonth = expenseFilters.month === 'All' || !expenseFilters.month || recMonth.toLowerCase() === expenseFilters.month.toLowerCase() || recMonth.toLowerCase().includes(expenseFilters.month.toLowerCase());
    const matchYear = expenseFilters.year === 'All' || !expenseFilters.year || recYear.toLowerCase() === expenseFilters.year.toString().toLowerCase() || recYear.toLowerCase().includes(expenseFilters.year.toString().toLowerCase());
    return matchDateRange && matchCategory && matchClient && matchMonth && matchYear;
  });

  const filteredAdExpenses = expenses.filter(exp => {
    if (!isMetaAd(exp.category)) return false;
    const recMonth = getRecordMonth(exp.date, exp.month);
    const recYear = getRecordYear(exp.date, exp.year);
    const matchClient = adExpenseFilters.clientName === 'All' || !adExpenseFilters.clientName || (exp.clientName && exp.clientName.toLowerCase().includes(adExpenseFilters.clientName.toLowerCase()));
    const matchMonth = adExpenseFilters.month === 'All' || !adExpenseFilters.month || recMonth.toLowerCase() === adExpenseFilters.month.toLowerCase() || recMonth.toLowerCase().includes(adExpenseFilters.month.toLowerCase());
    const matchYear = adExpenseFilters.year === 'All' || !adExpenseFilters.year || recYear.toLowerCase() === adExpenseFilters.year.toString().toLowerCase() || recYear.toLowerCase().includes(adExpenseFilters.year.toString().toLowerCase());
    return matchClient && matchMonth && matchYear;
  });

  const filteredBankDeposits = bankDeposits.filter(dep => {
    const recMonth = getRecordMonth(dep.date, dep.month);
    const recYear = getRecordYear(dep.date, dep.year);
    const matchDateRange = isDateInRange(dep.date, bankDepositFilters.startDate, bankDepositFilters.endDate);
    const matchType = bankDepositFilters.type === 'All' || !bankDepositFilters.type || (dep.type && dep.type.toLowerCase().includes(bankDepositFilters.type.toLowerCase()));
    const matchMonth = bankDepositFilters.month === 'All' || !bankDepositFilters.month || recMonth.toLowerCase() === bankDepositFilters.month.toLowerCase() || recMonth.toLowerCase().includes(bankDepositFilters.month.toLowerCase());
    const matchYear = bankDepositFilters.year === 'All' || !bankDepositFilters.year || recYear.toLowerCase() === bankDepositFilters.year.toString().toLowerCase() || recYear.toLowerCase().includes(bankDepositFilters.year.toString().toLowerCase());
    return matchDateRange && matchType && matchMonth && matchYear;
  });

  // Combined Ledger Entries
  const ledgerEntries = [
    ...incomes.map(inc => ({
      id: inc.id,
      date: inc.date || '',
      clientName: inc.clientName || '-',
      category: inc.category || '-',
      amount: Number(inc.amount) || 0,
      gstAmount: Number(inc.gstAmount) || 0,
      remarks: inc.remarks || '-',
      type: 'Income' as const,
      month: getRecordMonth(inc.date, inc.month),
      year: getRecordYear(inc.date, inc.year)
    })),
    ...expenses.map(exp => ({
      id: exp.id,
      date: exp.date || '',
      clientName: exp.clientName || '-',
      category: exp.category || '-',
      amount: Number(exp.amount) || 0,
      gstAmount: Number(exp.gstAmount) || 0,
      remarks: exp.remarks || '-',
      type: 'Expense' as const,
      month: getRecordMonth(exp.date, exp.month),
      year: getRecordYear(exp.date, exp.year)
    }))
  ].filter(entry => {
    const matchClient = ledgerFilters.clientName === 'All' || !ledgerFilters.clientName || (entry.clientName && entry.clientName.toLowerCase().includes(ledgerFilters.clientName.toLowerCase()));
    const matchMonth = ledgerFilters.month === 'All' || !ledgerFilters.month || (entry.month && entry.month.toLowerCase().includes(ledgerFilters.month.toLowerCase()));
    const matchYear = ledgerFilters.year === 'All' || !ledgerFilters.year || (entry.year && entry.year.toString().toLowerCase().includes(ledgerFilters.year.toString().toLowerCase()));
    return matchClient && matchMonth && matchYear;
  }).sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());

  const totalLedgerIncome = ledgerEntries.filter(e => e.type === 'Income').reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalLedgerIncomeGst = ledgerEntries.filter(e => e.type === 'Income').reduce((sum, e) => sum + (e.gstAmount || 0), 0);
  const totalLedgerExpense = ledgerEntries.filter(e => e.type === 'Expense').reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalLedgerExpenseGst = ledgerEntries.filter(e => e.type === 'Expense').reduce((sum, e) => sum + (e.gstAmount || 0), 0);

  // Overview Totals
  const overviewIncomes = incomes.filter(inc => {
    const recMonth = getRecordMonth(inc.date, inc.month);
    const recYear = getRecordYear(inc.date, inc.year);
    return (overviewFilters.month === 'All' || recMonth === overviewFilters.month) &&
      (overviewFilters.year === 'All' || recYear === overviewFilters.year);
  });
  const overviewExpenses = expenses.filter(exp => {
    const recMonth = getRecordMonth(exp.date, exp.month);
    const recYear = getRecordYear(exp.date, exp.year);
    return (overviewFilters.month === 'All' || recMonth === overviewFilters.month) &&
      (overviewFilters.year === 'All' || recYear === overviewFilters.year);
  });
  const overviewDeposits = bankDeposits.filter(dep => {
    const recMonth = getRecordMonth(dep.date, dep.month);
    const recYear = getRecordYear(dep.date, dep.year);
    return (overviewFilters.month === 'All' || recMonth === overviewFilters.month) &&
      (overviewFilters.year === 'All' || recYear === overviewFilters.year);
  });

  const totalOverviewIncome = overviewIncomes.reduce((sum, item) => sum + item.amount, 0);
  const totalOverviewExpense = overviewExpenses.reduce((sum, item) => sum + item.amount, 0);
  const totalOverviewDeposit = overviewDeposits.reduce((sum, item) => sum + item.amount, 0);

  const totalCashIncome = overviewIncomes.filter(inc => inc.paymentMethod?.toLowerCase().includes('cash')).reduce((sum, item) => sum + item.amount, 0);
  const totalInHand = totalCashIncome - totalOverviewDeposit;

  const totalIncome = filteredIncomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalIncomeGst = filteredIncomes.reduce((acc, curr) => acc + (curr.gstAmount || 0), 0);
  const totalExpense = filteredExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpenseGst = filteredExpenses.reduce((acc, curr) => acc + (curr.gstAmount || 0), 0);
  const totalAdExpense = filteredAdExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalAdExpenseGst = filteredAdExpenses.reduce((acc, curr) => acc + (curr.gstAmount || 0), 0);
  const totalBankDeposit = filteredBankDeposits.reduce((acc, curr) => acc + curr.amount, 0);

  const handleExportAdExpensePDF = () => {
    try {
      if (filteredAdExpenses.length === 0) {
        return toast({ title: 'No Ad Expense records to export' });
      }
      const doc = new jsPDF();
      doc.setFontSize(16);
      doc.text('Ad Expense Records', 14, 15);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 22);

      const headers = [['Date', 'Client Name', 'Category', 'Staff Name', 'Payment Mode', 'Bank', 'Ref No.', 'Remarks', 'Amount', 'GST']];
      const tableData = filteredAdExpenses.map(item => [
        formatDate(item.date) || '-',
        item.clientName || '-',
        item.category || '-',
        item.staffName || '-',
        item.paymentMethod || '-',
        item.bank || '-',
        item.rfNo || '-',
        item.remarks || '-',
        `Rs. ${item.amount?.toLocaleString('en-IN') || '0'}`,
        item.isGst ? `Rs. ${item.gstAmount?.toLocaleString('en-IN') || '0'}` : '-'
      ]);

      autoTable(doc, {
        head: headers,
        body: tableData,
        startY: 28,
        styles: { fontSize: 8 },
        headStyles: { fillColor: [63, 81, 181] }
      });

      const fileName = `ad_expense_records_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      toast({ title: 'Ad Expense PDF exported successfully' });
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast({ title: 'Failed to export PDF', variant: 'destructive' });
    }
  };

  const handlePreviewPDF = (data: any[], title: string) => {
    if (data.length === 0) return toast({ title: 'No data to download' });
    let headers: string[] = [];
    let tableData: any[][] = [];

    if (title === 'Income Records') {
      headers = ['Date', 'Client Name', 'Category', 'Mode of Payment', 'Deposited Bank', 'Ref No.', 'Month', 'Year', 'Invoice No.', 'Remarks', 'Amount', 'GST'];
      tableData = data.map(row => [
        formatDate(row.date), row.clientName, row.category || '-', row.paymentMethod && row.paymentMethod.toLowerCase() === 'cheque' && row.chequeNo ? `Cheque\nNo. : ${row.chequeNo}` : row.paymentMethod, row.bank, row.rfNo || '-', row.month, row.year, row.invoiceNumber || '-', row.remarks || '-', row.amount, row.gstAmount ? `₹${row.gstAmount}` : '-'
      ]);
    } else if (title === 'Expense Records') {
      headers = ['Date', 'Client Name', 'Category', 'Bank', 'Ref No.', 'Month', 'Year', 'Remarks', 'Amount', 'GST'];
      tableData = data.map(row => [
        formatDate(row.date), row.clientName || '-', row.category, row.bank || '-', row.rfNo || '-', row.month, row.year, row.remarks || '-', row.amount, row.gstAmount ? `₹${row.gstAmount}` : '-'
      ]);
    } else if (title === 'Bank Deposits') {
      headers = ['Date', 'Deposited Bank', 'Type', 'Cheque Details', 'Month', 'Year', 'Remarks', 'Amount'];
      tableData = data.map(row => [
        formatDate(row.date), row.bank || '-', row.type, row.type === 'Cheque' ? `${row.chequeNo} (${row.bankName})` : '-', row.month, row.year, row.remarks || '-', row.amount
      ]);
    } else if (title === 'Client Ledger Records') {
      headers = ['Date', 'Type', 'Client Name', 'Category', 'Remarks', 'Amount', 'GST'];
      tableData = data.map(row => [
        formatDate(row.date), row.type, row.clientName, row.category, row.remarks, row.amount, row.gstAmount ? `₹${row.gstAmount}` : '-'
      ]);
    } else if (title === 'Ad Expense Records') {
      headers = ['Date', 'Client Name', 'Category', 'Staff Name', 'Payment Mode', 'Bank', 'Ref No.', 'Remarks', 'Amount', 'GST'];
      tableData = data.map(row => [
        formatDate(row.date), row.clientName || '-', row.category || '-', row.staffName || '-', row.paymentMethod || '-', row.bank || '-', row.rfNo || '-', row.remarks || '-', row.amount, row.gstAmount ? `₹${row.gstAmount}` : '-'
      ]);
    }

    setPdfPreviewData({ title, headers, tableData });
  };

  const downloadGeneratedPDF = () => {
    if (!pdfPreviewData) return;
    const doc = new jsPDF();
    doc.text(pdfPreviewData.title, 14, 15);
    autoTable(doc, {
      head: [pdfPreviewData.headers],
      body: pdfPreviewData.tableData,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [22, 160, 133] }
    });
    doc.save(`${pdfPreviewData.title.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
    setPdfPreviewData(null);
  };

  const getUniqueValues = (data: any[], key: string) => {
    return Array.from(new Set(data.map(item => {
      if (key === 'month') return getRecordMonth(item.date, item.month);
      if (key === 'year') return getRecordYear(item.date, item.year);
      return item[key];
    }).filter(v => v !== undefined && v !== null && v !== ''))).sort();
  };

  return (
    <div className="space-y-6 animate-fade-up">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Accounts Management</h1>
      </div>

      <Tabs defaultValue="income" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-8 max-w-6xl mb-4 h-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
          <TabsTrigger value="expense">Expense</TabsTrigger>
          <TabsTrigger value="ad-expense">Ad Expense</TabsTrigger>
          <TabsTrigger value="bank-deposit">Bank Deposit</TabsTrigger>
          <TabsTrigger value="ledger">Ledger</TabsTrigger>
          <TabsTrigger value="pending-expense" className="flex items-center gap-1.5">
            Pending Expense
            {pendingExpenses.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500 text-white font-bold">
                {pendingExpenses.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* OVERVIEW TAB */}
        <TabsContent value="overview" className="space-y-4">
          <GlassCard>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-2">
              <CardTitle className="text-2xl font-bold">Total Overview</CardTitle>
              <div className="flex gap-2 mt-2 md:mt-0">
                <Select value={overviewFilters.month} onValueChange={v => setOverviewFilters({ ...overviewFilters, month: v })}>
                  <SelectTrigger className="w-[120px]"><SelectValue placeholder="Month" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Months</SelectItem>
                    {getUniqueValues([...incomes, ...expenses, ...bankDeposits], 'month').map((m: any) => m && <SelectItem key={m} value={m}>{m}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={overviewFilters.year} onValueChange={v => setOverviewFilters({ ...overviewFilters, year: v })}>
                  <SelectTrigger className="w-[120px]"><SelectValue placeholder="Year" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Years</SelectItem>
                    {getUniqueValues([...incomes, ...expenses, ...bankDeposits], 'year').map((y: any) => y && <SelectItem key={y} value={y}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pt-4">
                <div className="bg-green-100 dark:bg-green-900/30 p-6 rounded-xl border border-green-200 dark:border-green-800 flex flex-col items-center justify-center">
                  <span className="text-green-800 dark:text-green-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Income</span>
                  <span className="text-4xl font-bold text-green-900 dark:text-green-300">₹{totalOverviewIncome.toLocaleString()}</span>
                </div>
                <div className="bg-red-100 dark:bg-red-900/30 p-6 rounded-xl border border-red-200 dark:border-red-800 flex flex-col items-center justify-center">
                  <span className="text-red-800 dark:text-red-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Expense</span>
                  <span className="text-4xl font-bold text-red-900 dark:text-red-300">₹{totalOverviewExpense.toLocaleString()}</span>
                </div>
                <div className="bg-blue-100 dark:bg-blue-900/30 p-6 rounded-xl border border-blue-200 dark:border-blue-800 flex flex-col items-center justify-center">
                  <span className="text-blue-800 dark:text-blue-400 text-sm font-semibold uppercase tracking-wider mb-2">Total Bank Deposit</span>
                  <span className="text-4xl font-bold text-blue-900 dark:text-blue-300">₹{totalOverviewDeposit.toLocaleString()}</span>
                </div>
                <div className="bg-orange-100 dark:bg-orange-900/30 p-6 rounded-xl border border-orange-200 dark:border-orange-800 flex flex-col items-center justify-center">
                  <span className="text-orange-800 dark:text-orange-400 text-sm font-semibold uppercase tracking-wider mb-2">In Hand</span>
                  <span className="text-4xl font-bold text-orange-900 dark:text-orange-300">₹{totalInHand.toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* INCOME TAB */}
        <TabsContent value="income" className="space-y-4 mt-4">
          <GlassCard>
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setShowIncomeForm(!showIncomeForm)}>
              <CardTitle>Add Income</CardTitle>
              <Button variant="ghost" size="sm" className="p-0 h-8 w-8 hover:bg-transparent">
                {showIncomeForm ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
              </Button>
            </CardHeader>
            {showIncomeForm && (
              <CardContent>
                <form onSubmit={handleAddIncome} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={incomeForm.date} onChange={e => setIncomeForm({ ...incomeForm, date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Name</Label>
                    <Autocomplete
                      value={incomeForm.clientName}
                      onChange={v => setIncomeForm({ ...incomeForm, clientName: v })}
                      suggestions={clients}
                      placeholder="Type client name..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Autocomplete
                      value={incomeForm.category}
                      onChange={v => setIncomeForm({ ...incomeForm, category: v })}
                      suggestions={categories}
                      placeholder="Type category..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Autocomplete
                      value={incomeForm.paymentMethod}
                      onChange={v => setIncomeForm({ ...incomeForm, paymentMethod: v })}
                      suggestions={paymentMethods}
                      placeholder="Type payment mode..."
                    />
                  </div>
                  {incomeForm.paymentMethod.toLowerCase() === 'cheque' && (
                    <div className="space-y-2">
                      <Label>Cheque No. *</Label>
                      <Input
                        value={incomeForm.chequeNo}
                        onChange={e => setIncomeForm({ ...incomeForm, chequeNo: e.target.value })}
                        placeholder="Alphanumeric Cheque No."
                        required
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>Deposited Bank</Label>
                    <Autocomplete
                      value={incomeForm.bank}
                      onChange={v => setIncomeForm({ ...incomeForm, bank: v })}
                      suggestions={banks}
                      placeholder="Type deposited bank..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ref No.</Label>
                    <Input value={incomeForm.rfNo} onChange={e => setIncomeForm({ ...incomeForm, rfNo: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={incomeForm.amount} onChange={e => setIncomeForm({ ...incomeForm, amount: e.target.value })} required placeholder="0.00" />
                  </div>
                  <div className="space-y-2">
                    <Label>Invoice / Proforma No.</Label>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border rounded-md p-1 bg-muted/30 h-10">
                        <label className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold cursor-pointer rounded hover:bg-accent/50">
                          <input
                            type="radio"
                            name="invoicePrefix"
                            checked={incomeForm.invoicePrefix === 'INV'}
                            onChange={() => setIncomeForm({ ...incomeForm, invoicePrefix: 'INV' })}
                            className="accent-green-700"
                          />
                          INV
                        </label>
                        <label className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold cursor-pointer rounded hover:bg-accent/50">
                          <input
                            type="radio"
                            name="invoicePrefix"
                            checked={incomeForm.invoicePrefix === 'PFI'}
                            onChange={() => setIncomeForm({ ...incomeForm, invoicePrefix: 'PFI' })}
                            className="accent-green-700"
                          />
                          PFI
                        </label>
                      </div>
                      <Input
                        value={incomeForm.invoiceNumber}
                        onChange={e => setIncomeForm({ ...incomeForm, invoiceNumber: e.target.value })}
                        placeholder="e.g. 1234"
                        className="flex-1"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Remarks</Label>
                    <Input value={incomeForm.remarks} onChange={e => setIncomeForm({ ...incomeForm, remarks: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id="income-gst"
                      checked={incomeForm.isGst}
                      onCheckedChange={(checked) => setIncomeForm({ ...incomeForm, isGst: checked === true })}
                    />
                    <Label htmlFor="income-gst" className="font-medium cursor-pointer">GST (18% Included)</Label>
                  </div>
                  {incomeForm.isGst && (
                    <>
                      <div className="space-y-2">
                        <Label>Without GST Amount</Label>
                        <Input
                          type="text"
                          readOnly
                          value={incomeForm.amount ? (Number(incomeForm.amount) / 1.18).toFixed(2) : '0.00'}
                          className="bg-muted text-muted-foreground font-semibold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>GST Amount (18%)</Label>
                        <Input
                          type="text"
                          readOnly
                          value={incomeForm.amount ? (Number(incomeForm.amount) - Number(incomeForm.amount) / 1.18).toFixed(2) : '0.00'}
                          className="bg-muted text-muted-foreground font-semibold"
                        />
                      </div>
                    </>
                  )}
                  <div className={incomeForm.isGst ? "md:col-span-1" : "md:col-span-1 md:col-start-4"}>
                    <Button type="submit" className="w-full bg-green-800 hover:bg-green-900 text-white font-semibold">Add Income</Button>
                  </div>
                </form>
              </CardContent>
            )}
          </GlassCard>

          <GlassCard>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Income Records</CardTitle>
              <div className="flex items-center gap-2">
                <Input type="date" className="h-9 w-auto [&::-webkit-calendar-picker-indicator]:block" value={incomeFilters.startDate} onChange={e => setIncomeFilters({ ...incomeFilters, startDate: e.target.value })} placeholder="Start Date" />
                <span className="text-muted-foreground">-</span>
                <Input type="date" className="h-9 w-auto [&::-webkit-calendar-picker-indicator]:block" value={incomeFilters.endDate} onChange={e => setIncomeFilters({ ...incomeFilters, endDate: e.target.value })} placeholder="End Date" />
                <Button variant="outline" size="sm" onClick={() => setIncomeFilters({ clientName: 'All', category: 'All', paymentMethod: 'All', bank: 'All', month: 'All', year: 'All', invoiceNumber: '', startDate: '', endDate: '' })}>
                  Reset Filters
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePreviewPDF(filteredIncomes, 'Income Records')}>
                  <Download className="w-4 h-4 mr-2" /> Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3 flex-1">
                  <Input
                    placeholder="Filter Invoice No."
                    value={incomeFilters.invoiceNumber}
                    onChange={e => setIncomeFilters({ ...incomeFilters, invoiceNumber: e.target.value })}
                    className="h-10"
                  />
                  <Select
                    value={incomeFilters.clientName === 'All' ? 'All' : incomeFilters.clientName}
                    onValueChange={v => setIncomeFilters({ ...incomeFilters, clientName: v })}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="All Clients" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Clients</SelectItem>
                      {[...new Set([...clients, ...getUniqueValues(incomes, 'clientName')])].map(c => c && <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={incomeFilters.category === 'All' ? 'All' : incomeFilters.category}
                    onValueChange={v => setIncomeFilters({ ...incomeFilters, category: v })}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="All Categories" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Categories</SelectItem>
                      {[...new Set([...categories, ...getUniqueValues(incomes, 'category')])].map(c => c && <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={incomeFilters.paymentMethod === 'All' ? 'All' : incomeFilters.paymentMethod}
                    onValueChange={v => setIncomeFilters({ ...incomeFilters, paymentMethod: v })}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="All Modes" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Modes</SelectItem>
                      {[...new Set([...paymentMethods, ...getUniqueValues(incomes, 'paymentMethod')])].map(p => p && <SelectItem key={p} value={p}>{p}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={incomeFilters.bank === 'All' ? 'All' : incomeFilters.bank}
                    onValueChange={v => setIncomeFilters({ ...incomeFilters, bank: v })}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="All Banks" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Banks</SelectItem>
                      {[...new Set([...banks, ...getUniqueValues(incomes, 'bank')])].map(b => b && <SelectItem key={b} value={b}>{b}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={incomeFilters.month === 'All' ? 'All' : incomeFilters.month}
                    onValueChange={v => setIncomeFilters({ ...incomeFilters, month: v })}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="All Months" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Months</SelectItem>
                      {getUniqueValues(incomes, 'month').map(m => m && <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={incomeFilters.year === 'All' ? 'All' : incomeFilters.year}
                    onValueChange={v => setIncomeFilters({ ...incomeFilters, year: v })}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="All Years" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Years</SelectItem>
                      {getUniqueValues(incomes, 'year').map(y => y && <SelectItem key={y.toString()} value={y.toString()}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <div className="bg-success/10 text-success px-4 py-2 rounded-lg border border-success/20 shadow-sm flex items-center justify-center gap-3">
                    <span className="font-semibold text-sm">Total Income:</span>
                    <span className="text-xl font-bold">₹{totalIncome.toLocaleString()}</span>
                  </div>
                  <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-lg border border-amber-500/20 shadow-sm flex items-center justify-center gap-3">
                    <span className="font-semibold text-sm">Total GST:</span>
                    <span className="text-xl font-bold">₹{totalIncomeGst.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-green-100 hover:bg-green-200 text-green-900">
                      <TableHead className="text-green-900 font-semibold">Date</TableHead>
                      <TableHead className="text-green-900 font-semibold">Client Name</TableHead>
                      <TableHead className="text-green-900 font-semibold">Category</TableHead>
                      <TableHead className="text-green-900 font-semibold">Mode of Payment</TableHead>
                      <TableHead className="text-green-900 font-semibold">Deposited Bank</TableHead>
                      <TableHead className="text-green-900 font-semibold">Ref No.</TableHead>
                      <TableHead className="text-green-900 font-semibold">Month</TableHead>
                      <TableHead className="text-green-900 font-semibold">Year</TableHead>
                      <TableHead className="text-green-900 font-semibold">Invoice No.</TableHead>
                      <TableHead className="text-green-900 font-semibold">Remarks</TableHead>
                      <TableHead className="text-right text-green-900 font-semibold">Amount</TableHead>
                      <TableHead className="text-right text-green-900 font-semibold">GST</TableHead>
                      <TableHead className="w-[80px] text-green-900"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredIncomes.map((inc) => (
                      <TableRow key={inc.id}>
                        <TableCell>{formatDate(inc.date)}</TableCell>
                        <TableCell className="font-medium">{inc.clientName}</TableCell>
                        <TableCell>{inc.category || '-'}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span>{inc.paymentMethod}</span>
                            {inc.paymentMethod.toLowerCase() === 'cheque' && inc.chequeNo && (
                              <span className="text-xs text-muted-foreground font-medium mt-0.5">
                                No. : {inc.chequeNo}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{inc.bank}</TableCell>
                        <TableCell>{inc.rfNo || '-'}</TableCell>
                        <TableCell>{inc.month}</TableCell>
                        <TableCell>{inc.year}</TableCell>
                        <TableCell>{inc.invoiceNumber || '-'}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={inc.remarks}>{inc.remarks || '-'}</TableCell>
                        <TableCell className="text-right font-medium">₹{inc.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium text-amber-600 dark:text-amber-400">{inc.gstAmount ? `₹${inc.gstAmount.toLocaleString()}` : '-'}</TableCell>
                        <TableCell className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => setEditingIncome(inc)} className="text-blue-500 hover:text-blue-700">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteIncome(inc.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredIncomes.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-4 text-muted-foreground">No income records found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* EXPENSE TAB */}
        <TabsContent value="expense" className="space-y-4 mt-4">
          <GlassCard>
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setShowExpenseForm(!showExpenseForm)}>
              <CardTitle>Add Expense</CardTitle>
              <Button variant="ghost" size="sm" className="p-0 h-8 w-8 hover:bg-transparent">
                {showExpenseForm ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
              </Button>
            </CardHeader>
            {showExpenseForm && (
              <CardContent>
                <form onSubmit={handleAddExpense} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={expenseForm.date} onChange={e => setExpenseForm({ ...expenseForm, date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Client Name</Label>
                    <Autocomplete
                      value={expenseForm.clientName}
                      onChange={v => setExpenseForm({ ...expenseForm, clientName: v })}
                      suggestions={clients}
                      placeholder="Type client name..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Autocomplete
                      value={expenseForm.category}
                      onChange={v => setExpenseForm({ ...expenseForm, category: v })}
                      suggestions={categories}
                      placeholder="Type category..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Mode</Label>
                    <Autocomplete
                      value={expenseForm.paymentMethod}
                      onChange={v => setExpenseForm({ ...expenseForm, paymentMethod: v })}
                      suggestions={paymentMethods}
                      placeholder="Type payment mode..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bank</Label>
                    <Autocomplete
                      value={expenseForm.bank}
                      onChange={v => setExpenseForm({ ...expenseForm, bank: v })}
                      suggestions={banks}
                      placeholder="Type bank..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Ref No.</Label>
                    <Input value={expenseForm.rfNo} onChange={e => setExpenseForm({ ...expenseForm, rfNo: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={expenseForm.amount} onChange={e => setExpenseForm({ ...expenseForm, amount: e.target.value })} required placeholder="0.00" />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Remarks</Label>
                    <Input value={expenseForm.remarks} onChange={e => setExpenseForm({ ...expenseForm, remarks: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="flex items-center space-x-2 py-2">
                    <Checkbox
                      id="expense-gst"
                      checked={expenseForm.isGst}
                      onCheckedChange={(checked) => setExpenseForm({ ...expenseForm, isGst: checked === true })}
                    />
                    <Label htmlFor="expense-gst" className="font-medium cursor-pointer">GST (18% Included)</Label>
                  </div>
                  {expenseForm.isGst && (
                    <>
                      <div className="space-y-2">
                        <Label>Without GST Amount</Label>
                        <Input
                          type="text"
                          readOnly
                          value={expenseForm.amount ? (Number(expenseForm.amount) / 1.18).toFixed(2) : '0.00'}
                          className="bg-muted text-muted-foreground font-semibold"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>GST Amount (18%)</Label>
                        <Input
                          type="text"
                          readOnly
                          value={expenseForm.amount ? (Number(expenseForm.amount) - Number(expenseForm.amount) / 1.18).toFixed(2) : '0.00'}
                          className="bg-muted text-muted-foreground font-semibold"
                        />
                      </div>
                    </>
                  )}
                  <div className={expenseForm.isGst ? "md:col-span-1" : "md:col-span-1 md:col-start-4"}>
                    <Button type="submit" variant="destructive" className="w-full">Add Expense</Button>
                  </div>
                </form>
              </CardContent>
            )}
          </GlassCard>

          <GlassCard>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <CardTitle>Expense Records</CardTitle>
              <div className="flex items-center gap-2">
                <Input type="date" className="h-9 w-auto [&::-webkit-calendar-picker-indicator]:block" value={expenseFilters.startDate} onChange={e => setExpenseFilters({ ...expenseFilters, startDate: e.target.value })} placeholder="Start Date" />
                <span className="text-muted-foreground">-</span>
                <Input type="date" className="h-9 w-auto [&::-webkit-calendar-picker-indicator]:block" value={expenseFilters.endDate} onChange={e => setExpenseFilters({ ...expenseFilters, endDate: e.target.value })} placeholder="End Date" />
                <Button variant="outline" size="sm" onClick={() => setExpenseFilters({ clientName: 'All', category: 'All', month: 'All', year: 'All', startDate: '', endDate: '' })}>
                  Reset Filters
                </Button>
                <Button variant="outline" size="sm" onClick={() => handlePreviewPDF(filteredExpenses, 'Expense Records')}>
                  <Download className="w-4 h-4 mr-2" /> Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 flex-1">
                  <Select
                    value={expenseFilters.category === 'All' ? 'All' : expenseFilters.category}
                    onValueChange={v => setExpenseFilters({ ...expenseFilters, category: v })}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="All Categories" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Categories</SelectItem>
                      {[...new Set([...categories, ...getUniqueValues(expenses, 'category')])].map(c => c && <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={expenseFilters.clientName === 'All' ? 'All' : expenseFilters.clientName}
                    onValueChange={v => setExpenseFilters({ ...expenseFilters, clientName: v })}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="All Clients" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Clients</SelectItem>
                      {[...new Set([...clients, ...getUniqueValues(expenses, 'clientName')])].map(c => c && <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={expenseFilters.month === 'All' ? 'All' : expenseFilters.month}
                    onValueChange={v => setExpenseFilters({ ...expenseFilters, month: v })}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="All Months" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Months</SelectItem>
                      {getUniqueValues(expenses, 'month').map(m => m && <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={expenseFilters.year === 'All' ? 'All' : expenseFilters.year}
                    onValueChange={v => setExpenseFilters({ ...expenseFilters, year: v })}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="All Years" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Years</SelectItem>
                      {getUniqueValues(expenses, 'year').map(y => y && <SelectItem key={y.toString()} value={y.toString()}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <div className="bg-destructive/10 text-destructive px-4 py-2 rounded-lg border border-destructive/20 shadow-sm flex items-center justify-center gap-3">
                    <span className="font-semibold text-sm">Total Expense:</span>
                    <span className="text-xl font-bold">₹{totalExpense.toLocaleString()}</span>
                  </div>
                  <div className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-4 py-2 rounded-lg border border-amber-500/20 shadow-sm flex items-center justify-center gap-3">
                    <span className="font-semibold text-sm">Total GST:</span>
                    <span className="text-xl font-bold">₹{totalExpenseGst.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-destructive/10 hover:bg-destructive/10">
                      <TableHead>Date</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Ref No.</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-right">GST</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredExpenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>{formatDate(exp.date)}</TableCell>
                        <TableCell>{exp.clientName || '-'}</TableCell>
                        <TableCell className="font-medium">{exp.category}</TableCell>
                        <TableCell>{exp.bank || '-'}</TableCell>
                        <TableCell>{exp.rfNo || '-'}</TableCell>
                        <TableCell>{exp.month}</TableCell>
                        <TableCell>{exp.year}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={exp.remarks}>{exp.remarks || '-'}</TableCell>
                        <TableCell className="text-right font-medium">₹{exp.amount.toLocaleString()}</TableCell>
                        <TableCell className="text-right font-medium text-amber-600 dark:text-amber-400">{exp.gstAmount ? `₹${exp.gstAmount.toLocaleString()}` : '-'}</TableCell>
                        <TableCell className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => setEditingExpense(exp)} className="text-blue-500 hover:text-blue-700">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteExpense(exp.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredExpenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-4 text-muted-foreground">No expense records found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* AD EXPENSE TAB */}
        <TabsContent value="ad-expense" className="space-y-4 mt-4">
          <GlassCard>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 gap-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  Ad Expense Records
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300">
                    Meta Ad
                  </span>
                </CardTitle>
                <CardDescription>Filtered view of all approved Meta Ad expenses.</CardDescription>
              </div>
              <div className="flex gap-2 items-center flex-wrap">
                <span className="text-sm font-semibold text-primary px-3 py-1 bg-primary/10 rounded-full">
                  Total Ad Expense: ₹{totalAdExpense.toLocaleString()}
                </span>
                <span className="text-sm font-semibold text-amber-600 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 rounded-full">
                  Total GST: ₹{totalAdExpenseGst.toLocaleString()}
                </span>
                <Button variant="outline" size="sm" onClick={() => handleExportAdExpensePDF()}>
                  <FileText className="w-4 h-4 mr-1" /> Export PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-muted/30 p-3 rounded-lg border">
                <div>
                  <Label className="text-xs mb-1 block">Client Name</Label>
                  <Select
                    value={adExpenseFilters.clientName === 'All' ? 'All' : adExpenseFilters.clientName}
                    onValueChange={v => setAdExpenseFilters({ ...adExpenseFilters, clientName: v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Clients" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Clients</SelectItem>
                      {getUniqueValues(expenses.filter(e => isMetaAd(e.category)), 'clientName').map(c => c && <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Month</Label>
                  <Select
                    value={adExpenseFilters.month === 'All' ? 'All' : adExpenseFilters.month}
                    onValueChange={v => setAdExpenseFilters({ ...adExpenseFilters, month: v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Months" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Months</SelectItem>
                      {getUniqueValues(expenses.filter(e => isMetaAd(e.category)), 'month').map(m => m && <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs mb-1 block">Year</Label>
                  <Select
                    value={adExpenseFilters.year === 'All' ? 'All' : adExpenseFilters.year}
                    onValueChange={v => setAdExpenseFilters({ ...adExpenseFilters, year: v })}
                  >
                    <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="All Years" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Years</SelectItem>
                      {getUniqueValues(expenses.filter(e => isMetaAd(e.category)), 'year').map(y => y && <SelectItem key={y.toString()} value={y.toString()}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button variant="ghost" size="sm" onClick={() => setAdExpenseFilters({ clientName: 'All', month: 'All', year: 'All' })} className="h-8 text-xs text-muted-foreground hover:text-foreground">
                    Reset Filters
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Staff Name</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Ref No.</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>GST</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdExpenses.map((exp) => (
                      <TableRow key={exp.id}>
                        <TableCell>{formatDate(exp.date)}</TableCell>
                        <TableCell className="font-semibold text-primary">{exp.clientName || '-'}</TableCell>
                        <TableCell className="font-medium text-purple-600 dark:text-purple-400">{exp.category}</TableCell>
                        <TableCell className="text-muted-foreground text-xs">{exp.staffName || '-'}</TableCell>
                        <TableCell>{exp.paymentMethod || '-'}</TableCell>
                        <TableCell>{exp.bank || '-'}</TableCell>
                        <TableCell>{exp.rfNo || '-'}</TableCell>
                        <TableCell>{exp.remarks || '-'}</TableCell>
                        <TableCell className="font-semibold text-destructive">₹{exp.amount.toLocaleString()}</TableCell>
                        <TableCell>{exp.isGst && exp.gstAmount ? `₹${exp.gstAmount}` : '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setEditingExpense({ ...exp })} className="p-1 h-7 w-7 text-blue-500 hover:text-blue-700">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(exp.id)} className="p-1 h-7 w-7 text-red-500 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredAdExpenses.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">No Ad expense records found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* BANK DEPOSIT TAB */}
        <TabsContent value="bank-deposit" className="space-y-4 mt-4">
          <GlassCard>
            <CardHeader className="flex flex-row items-center justify-between cursor-pointer" onClick={() => setShowBankDepositForm(!showBankDepositForm)}>
              <CardTitle>Add Bank Deposit</CardTitle>
              <Button variant="ghost" size="sm" className="p-0 h-8 w-8 hover:bg-transparent">
                {showBankDepositForm ? <ChevronUp className="w-5 h-5 text-muted-foreground" /> : <ChevronDown className="w-5 h-5 text-muted-foreground" />}
              </Button>
            </CardHeader>
            {showBankDepositForm && (
              <CardContent>
                <form onSubmit={handleAddBankDeposit} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={bankDepositForm.date} onChange={e => setBankDepositForm({ ...bankDepositForm, date: e.target.value })} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Type</Label>
                    <Autocomplete
                      value={bankDepositForm.type}
                      onChange={v => setBankDepositForm({ ...bankDepositForm, type: v })}
                      suggestions={['Cash', 'Cheque']}
                      placeholder="Type Cash/Cheque..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Deposited Bank</Label>
                    <Autocomplete
                      value={bankDepositForm.bank}
                      onChange={v => setBankDepositForm({ ...bankDepositForm, bank: v })}
                      suggestions={banks}
                      placeholder="Type bank..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Amount</Label>
                    <Input type="number" step="0.01" value={bankDepositForm.amount} onChange={e => setBankDepositForm({ ...bankDepositForm, amount: e.target.value })} required placeholder="0.00" />
                  </div>
                  {bankDepositForm.type === 'Cheque' && (
                    <>
                      <div className="space-y-2">
                        <Label>Cheque No.</Label>
                        <Input value={bankDepositForm.chequeNo} onChange={e => setBankDepositForm({ ...bankDepositForm, chequeNo: e.target.value })} required placeholder="Alphanumeric" />
                      </div>
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Autocomplete
                          value={bankDepositForm.bankName}
                          onChange={v => setBankDepositForm({ ...bankDepositForm, bankName: v })}
                          suggestions={banks}
                          placeholder="Type bank name..."
                        />
                      </div>
                    </>
                  )}
                  <div className="space-y-2">
                    <Label>Remarks</Label>
                    <Input value={bankDepositForm.remarks} onChange={e => setBankDepositForm({ ...bankDepositForm, remarks: e.target.value })} placeholder="Optional" />
                  </div>
                  <div className="md:col-span-1">
                    <Button type="submit" variant="royal" className="w-full">Add Deposit</Button>
                  </div>
                </form>
              </CardContent>
            )}
          </GlassCard>

          <GlassCard>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bank Deposits History</CardTitle>
              <Button variant="outline" size="sm" onClick={() => handlePreviewPDF(filteredBankDeposits, 'Bank Deposits')}>
                <Download className="w-4 h-4 mr-2" /> Export PDF
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 justify-between mb-4">
                <div className="grid grid-cols-2 md:grid-cols-6 gap-3 flex-1 items-center">
                  <Input type="date" className="h-10 [&::-webkit-calendar-picker-indicator]:block" value={bankDepositFilters.startDate} onChange={e => setBankDepositFilters({ ...bankDepositFilters, startDate: e.target.value })} placeholder="Start Date" />
                  <Input type="date" className="h-10 [&::-webkit-calendar-picker-indicator]:block" value={bankDepositFilters.endDate} onChange={e => setBankDepositFilters({ ...bankDepositFilters, endDate: e.target.value })} placeholder="End Date" />
                  <Select
                    value={bankDepositFilters.type === 'All' ? 'All' : bankDepositFilters.type}
                    onValueChange={v => setBankDepositFilters({ ...bankDepositFilters, type: v })}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="All Types" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Types</SelectItem>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={bankDepositFilters.month === 'All' ? 'All' : bankDepositFilters.month}
                    onValueChange={v => setBankDepositFilters({ ...bankDepositFilters, month: v })}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="All Months" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Months</SelectItem>
                      {getUniqueValues(bankDeposits, 'month').map(m => m && <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select
                    value={bankDepositFilters.year === 'All' ? 'All' : bankDepositFilters.year}
                    onValueChange={v => setBankDepositFilters({ ...bankDepositFilters, year: v })}
                  >
                    <SelectTrigger className="h-10"><SelectValue placeholder="All Years" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Years</SelectItem>
                      {getUniqueValues(bankDeposits, 'year').map(y => y && <SelectItem key={y.toString()} value={y.toString()}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => setBankDepositFilters({ type: 'All', month: 'All', year: 'All', startDate: '', endDate: '' })} className="h-10">
                    Reset Filters
                  </Button>
                </div>
                <div className="bg-blue-100/50 text-blue-800 px-4 py-2 rounded-lg border border-blue-200 flex items-center gap-3 shrink-0">
                  <span className="font-semibold text-sm">Total Deposit:</span>
                  <span className="text-xl font-bold">₹{totalBankDeposit.toLocaleString()}</span>
                </div>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50 hover:bg-blue-50">
                      <TableHead>Date</TableHead>
                      <TableHead>Deposited Bank</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Cheque Details</TableHead>
                      <TableHead>Month</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-[80px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredBankDeposits.map((dep) => (
                      <TableRow key={dep.id}>
                        <TableCell>{formatDate(dep.date)}</TableCell>
                        <TableCell>{dep.bank || '-'}</TableCell>
                        <TableCell className="font-medium">{dep.type}</TableCell>
                        <TableCell>{dep.type === 'Cheque' ? `${dep.chequeNo} (${dep.bankName})` : '-'}</TableCell>
                        <TableCell>{dep.month}</TableCell>
                        <TableCell>{dep.year}</TableCell>
                        <TableCell className="max-w-[150px] truncate" title={dep.remarks}>{dep.remarks || '-'}</TableCell>
                        <TableCell className="text-right font-medium text-blue-700">₹{dep.amount.toLocaleString()}</TableCell>
                        <TableCell className="flex gap-1 justify-end">
                          <Button variant="ghost" size="icon" onClick={() => setEditingBankDeposit(dep)} className="text-blue-500 hover:text-blue-700">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteBankDeposit(dep.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredBankDeposits.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-4 text-muted-foreground">No bank deposit records found</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* LEDGER TAB */}
        <TabsContent value="ledger" className="space-y-4 mt-4">
          {/* Summary Cards Top */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <GlassCard className="p-4 bg-green-50/80 dark:bg-green-950/30 border-green-200 dark:border-green-800">
              <p className="text-xs font-semibold text-green-700 dark:text-green-400 uppercase tracking-wider">Total Income</p>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100 mt-1">₹{totalLedgerIncome.toLocaleString()}</p>
              <p className="text-xs text-green-700 dark:text-green-400 mt-1">GST Included: ₹{totalLedgerIncomeGst.toLocaleString()}</p>
            </GlassCard>

            <GlassCard className="p-4 bg-red-50/80 dark:bg-red-950/30 border-red-200 dark:border-red-800">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400 uppercase tracking-wider">Total Expense</p>
              <p className="text-2xl font-bold text-red-900 dark:text-red-100 mt-1">₹{totalLedgerExpense.toLocaleString()}</p>
              <p className="text-xs text-red-700 dark:text-red-400 mt-1">GST Included: ₹{totalLedgerExpenseGst.toLocaleString()}</p>
            </GlassCard>

            <GlassCard className="p-4 bg-blue-50/80 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800">
              <p className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">Net Balance</p>
              <p className={`text-2xl font-bold mt-1 ${totalLedgerIncome - totalLedgerExpense >= 0 ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'}`}>
                ₹{(totalLedgerIncome - totalLedgerExpense).toLocaleString()}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">Income minus Expense</p>
            </GlassCard>

            <GlassCard className="p-4 bg-amber-50/80 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
              <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Net GST</p>
              <p className="text-2xl font-bold text-amber-900 dark:text-amber-100 mt-1">
                ₹{(totalLedgerIncomeGst - totalLedgerExpenseGst).toLocaleString()}
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">Income GST - Expense GST</p>
            </GlassCard>
          </div>

          {/* Ledger Table Section */}
          <GlassCard>
            <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between pb-4 gap-4">
              <div>
                <CardTitle className="text-xl font-bold">Client Ledger Records</CardTitle>
                <CardDescription>Comprehensive client-wise breakdown of both Income and Expense transactions</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePreviewPDF(ledgerEntries, 'Client Ledger Records')}
                className="flex items-center gap-2 border-primary/20 hover:bg-primary/5"
              >
                <FileText className="h-4 w-4 text-primary" />
                <span>Download PDF</span>
              </Button>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3 mb-6 bg-muted/30 p-3 rounded-lg border border-border/50">
                <div className="w-[240px]">
                  <Select
                    value={ledgerFilters.clientName === 'All' ? 'All' : ledgerFilters.clientName}
                    onValueChange={v => setLedgerFilters({ ...ledgerFilters, clientName: v })}
                  >
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Clients" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Clients</SelectItem>
                      {[...new Set([...clients, ...getUniqueValues([...incomes, ...expenses], 'clientName')])].map(c => c && <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-[160px]">
                  <Select
                    value={ledgerFilters.month === 'All' ? 'All' : ledgerFilters.month}
                    onValueChange={v => setLedgerFilters({ ...ledgerFilters, month: v })}
                  >
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Months" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Months</SelectItem>
                      {getUniqueValues([...incomes, ...expenses], 'month').map(m => m && <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-[140px]">
                  <Select
                    value={ledgerFilters.year === 'All' ? 'All' : ledgerFilters.year}
                    onValueChange={v => setLedgerFilters({ ...ledgerFilters, year: v })}
                  >
                    <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Years" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All Years</SelectItem>
                      {getUniqueValues([...incomes, ...expenses], 'year').map(y => y && <SelectItem key={y.toString()} value={y.toString()}>{y}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                {(ledgerFilters.clientName !== 'All' || ledgerFilters.month !== 'All' || ledgerFilters.year !== 'All') && (
                  <Button variant="ghost" size="sm" onClick={() => setLedgerFilters({ clientName: 'All', month: 'All', year: 'All' })} className="text-muted-foreground h-9">
                    Reset
                  </Button>
                )}
              </div>

              {/* Ledger Table */}
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/60">
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Client Name</TableHead>
                      <TableHead className="font-semibold">Category</TableHead>
                      <TableHead className="font-semibold">Remarks</TableHead>
                      <TableHead className="text-right font-semibold">Amount</TableHead>
                      <TableHead className="text-right font-semibold">GST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledgerEntries.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No ledger records found matching the filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      ledgerEntries.map((item) => (
                        <TableRow
                          key={`${item.type}-${item.id}`}
                          className={
                            item.type === 'Income'
                              ? 'bg-green-100/70 hover:bg-green-200/80 dark:bg-green-950/30 dark:hover:bg-green-900/40 text-green-950 dark:text-green-200 border-l-4 border-l-green-600'
                              : 'bg-red-100/70 hover:bg-red-200/80 dark:bg-red-950/30 dark:hover:bg-red-900/40 text-red-950 dark:text-red-200 border-l-4 border-l-red-600'
                          }
                        >
                          <TableCell className="font-medium">{formatDate(item.date)}</TableCell>
                          <TableCell>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                                item.type === 'Income'
                                  ? 'bg-green-600 text-white dark:bg-green-500 dark:text-green-950'
                                  : 'bg-red-600 text-white dark:bg-red-500 dark:text-red-950'
                              }`}
                            >
                              {item.type}
                            </span>
                          </TableCell>
                          <TableCell className="font-semibold">{item.clientName}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell className="max-w-[200px] truncate" title={item.remarks}>{item.remarks}</TableCell>
                          <TableCell className="text-right font-bold">₹{item.amount.toLocaleString()}</TableCell>
                          <TableCell className="text-right font-medium">
                            {item.gstAmount ? `₹${item.gstAmount.toLocaleString()}` : '-'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* PENDING EXPENSE TAB */}
        <TabsContent value="pending-expense" className="space-y-4 mt-4">
          <GlassCard>
            <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 gap-4">
              <div>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  Pending Staff Expenses
                  {pendingExpenses.length > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                      {pendingExpenses.length} Pending
                    </span>
                  )}
                </CardTitle>
                <CardDescription>Review and edit expenses submitted by staff before approving them into main accounts.</CardDescription>
              </div>
              {pendingExpenses.length > 0 && (
                <Button
                  onClick={handleApproveAllPendingExpenses}
                  className="bg-success hover:bg-success/90 text-success-foreground font-semibold flex items-center gap-2 shadow-sm"
                >
                  <Check className="h-4 w-4" />
                  Approve All ({pendingExpenses.length})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Submitted By</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Client Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Payment Mode</TableHead>
                      <TableHead>Bank</TableHead>
                      <TableHead>Ref No.</TableHead>
                      <TableHead>Remarks</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>GST</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingExpenses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                          No pending expenses found. All staff submissions have been approved.
                        </TableCell>
                      </TableRow>
                    ) : (
                      pendingExpenses.map(item => {
                        const isEditing = editingPendingExpense?.id === item.id;
                        return (
                          <TableRow key={item.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium text-primary">
                              {item.staffName || 'Staff Member'}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  type="date"
                                  className="[&::-webkit-calendar-picker-indicator]:block w-[135px] text-xs h-8"
                                  value={editingPendingExpense.date}
                                  onChange={e => setEditingPendingExpense({ ...editingPendingExpense, date: e.target.value })}
                                />
                              ) : formatDate(item.date)}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Autocomplete
                                  value={editingPendingExpense.clientName || ''}
                                  onChange={v => setEditingPendingExpense({ ...editingPendingExpense, clientName: v })}
                                  suggestions={clients}
                                  placeholder="Client..."
                                  className="w-[140px]"
                                />
                              ) : (item.clientName || '-')}
                            </TableCell>
                            <TableCell className="font-medium">
                              {isEditing ? (
                                <Autocomplete
                                  value={editingPendingExpense.category}
                                  onChange={v => setEditingPendingExpense({ ...editingPendingExpense, category: v })}
                                  suggestions={categories}
                                  placeholder="Category..."
                                  className="w-[140px]"
                                />
                              ) : item.category}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Autocomplete
                                  value={editingPendingExpense.paymentMethod || ''}
                                  onChange={v => setEditingPendingExpense({ ...editingPendingExpense, paymentMethod: v })}
                                  suggestions={paymentMethods}
                                  placeholder="Mode..."
                                  className="w-[130px]"
                                />
                              ) : (item.paymentMethod || '-')}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Autocomplete
                                  value={editingPendingExpense.bank || ''}
                                  onChange={v => setEditingPendingExpense({ ...editingPendingExpense, bank: v })}
                                  suggestions={banks}
                                  placeholder="Bank..."
                                  className="w-[130px]"
                                />
                              ) : (item.bank || '-')}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  className="w-[100px] text-xs h-8"
                                  value={editingPendingExpense.rfNo || ''}
                                  onChange={e => setEditingPendingExpense({ ...editingPendingExpense, rfNo: e.target.value })}
                                />
                              ) : (item.rfNo || '-')}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <Input
                                  className="w-[150px] text-xs h-8"
                                  value={editingPendingExpense.remarks || ''}
                                  onChange={e => setEditingPendingExpense({ ...editingPendingExpense, remarks: e.target.value })}
                                />
                              ) : (item.remarks || '-')}
                            </TableCell>
                            <TableCell className="font-semibold text-destructive">
                              {isEditing ? (
                                <Input
                                  type="number"
                                  step="0.01"
                                  className="w-[100px] text-xs h-8"
                                  value={editingPendingExpense.amount}
                                  onChange={e => setEditingPendingExpense({ ...editingPendingExpense, amount: Number(e.target.value) || 0 })}
                                />
                              ) : `₹${item.amount.toLocaleString()}`}
                            </TableCell>
                            <TableCell>
                              {isEditing ? (
                                <div className="flex items-center gap-1">
                                  <Checkbox
                                    id={`admin-edit-gst-${item.id}`}
                                    checked={editingPendingExpense.isGst}
                                    onCheckedChange={(checked) => setEditingPendingExpense({ ...editingPendingExpense, isGst: checked === true })}
                                  />
                                  <Label htmlFor={`admin-edit-gst-${item.id}`} className="text-xs">GST</Label>
                                </div>
                              ) : (item.isGst && item.gstAmount ? `₹${item.gstAmount}` : '-')}
                            </TableCell>
                            <TableCell className="text-right">
                              {isEditing ? (
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="ghost" onClick={handleUpdatePendingExpense} className="h-8 w-8 p-0 text-success hover:text-success/80">
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingPendingExpense(null)} className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1">
                                  <Button size="sm" variant="ghost" onClick={() => handleApprovePendingExpense(item.id)} className="h-8 w-8 p-0 text-success hover:text-success hover:bg-success/10" title="Approve this expense">
                                    <Check className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => setEditingPendingExpense({ ...item })} className="h-8 w-8 p-0 text-muted-foreground hover:text-primary" title="Edit row">
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button size="sm" variant="ghost" onClick={() => handleDeletePendingExpense(item.id)} className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive" title="Delete row">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </GlassCard>
        </TabsContent>

        {/* SETTINGS TAB */}
        <TabsContent value="settings" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Clients Setting */}
            <GlassCard>
              <CardHeader><CardTitle>Manage Clients</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input placeholder="New client name" value={newClient} onChange={e => setNewClient(e.target.value)} ref={clientInputRef} />
                  <Button onClick={() => handleAddSetting('accountClients', newClient, clients, setClients, () => setNewClient(''), clientInputRef)}>Add</Button>
                </div>
                <div className="space-y-2">
                  {clients.map(c => (
                    <div key={c} className="flex justify-between items-center p-2 bg-muted/50 rounded border">
                      {editingSetting?.key === 'accountClients' && editingSetting?.oldValue === c ? (
                        <div className="flex gap-2 w-full mr-2">
                          <Input value={editingSetting.newValue} onChange={(e) => setEditingSetting({ ...editingSetting, newValue: e.target.value })} autoFocus />
                          <Button size="sm" onClick={() => handleEditSetting('accountClients', c, editingSetting.newValue, clients, setClients)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSetting(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <span>{c}</span>
                          <div>
                            <Button variant="ghost" size="sm" onClick={() => setEditingSetting({ key: 'accountClients', oldValue: c, newValue: c })}><Pencil className="w-4 h-4 text-blue-500" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveSetting('accountClients', c, clients, setClients)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {clients.length === 0 && <p className="text-sm text-muted-foreground text-center">No clients added.</p>}
                </div>
              </CardContent>
            </GlassCard>

            {/* Payment Methods Setting */}
            <GlassCard>
              <CardHeader><CardTitle>Manage Payment Methods</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input placeholder="New payment method" value={newPaymentMethod} onChange={e => setNewPaymentMethod(e.target.value)} ref={paymentMethodInputRef} />
                  <Button onClick={() => handleAddSetting('accountPaymentMethods', newPaymentMethod, paymentMethods, setPaymentMethods, () => setNewPaymentMethod(''), paymentMethodInputRef)}>Add</Button>
                </div>
                <div className="space-y-2">
                  {paymentMethods.map(m => (
                    <div key={m} className="flex justify-between items-center p-2 bg-muted/50 rounded border">
                      {editingSetting?.key === 'accountPaymentMethods' && editingSetting?.oldValue === m ? (
                        <div className="flex gap-2 w-full mr-2">
                          <Input value={editingSetting.newValue} onChange={(e) => setEditingSetting({ ...editingSetting, newValue: e.target.value })} autoFocus />
                          <Button size="sm" onClick={() => handleEditSetting('accountPaymentMethods', m, editingSetting.newValue, paymentMethods, setPaymentMethods)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSetting(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <span>{m}</span>
                          <div>
                            <Button variant="ghost" size="sm" onClick={() => setEditingSetting({ key: 'accountPaymentMethods', oldValue: m, newValue: m })}><Pencil className="w-4 h-4 text-blue-500" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveSetting('accountPaymentMethods', m, paymentMethods, setPaymentMethods)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {paymentMethods.length === 0 && <p className="text-sm text-muted-foreground text-center">No methods added.</p>}
                </div>
              </CardContent>
            </GlassCard>

            {/* Banks Setting */}
            <GlassCard>
              <CardHeader><CardTitle>Manage Banks</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input placeholder="New bank name" value={newBank} onChange={e => setNewBank(e.target.value)} ref={bankInputRef} />
                  <Button onClick={() => handleAddSetting('accountBanks', newBank, banks, setBanks, () => setNewBank(''), bankInputRef)}>Add</Button>
                </div>
                <div className="space-y-2">
                  {banks.map(b => (
                    <div key={b} className="flex justify-between items-center p-2 bg-muted/50 rounded border">
                      {editingSetting?.key === 'accountBanks' && editingSetting?.oldValue === b ? (
                        <div className="flex gap-2 w-full mr-2">
                          <Input value={editingSetting.newValue} onChange={(e) => setEditingSetting({ ...editingSetting, newValue: e.target.value })} autoFocus />
                          <Button size="sm" onClick={() => handleEditSetting('accountBanks', b, editingSetting.newValue, banks, setBanks)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSetting(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <span>{b}</span>
                          <div>
                            <Button variant="ghost" size="sm" onClick={() => setEditingSetting({ key: 'accountBanks', oldValue: b, newValue: b })}><Pencil className="w-4 h-4 text-blue-500" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveSetting('accountBanks', b, banks, setBanks)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {banks.length === 0 && <p className="text-sm text-muted-foreground text-center">No banks added.</p>}
                </div>
              </CardContent>
            </GlassCard>

            {/* Expense Categories Setting */}
            <GlassCard>
              <CardHeader><CardTitle>Manage Expense Categories</CardTitle></CardHeader>
              <CardContent>
                <div className="flex gap-2 mb-4">
                  <Input placeholder="New category" value={newCategory} onChange={e => setNewCategory(e.target.value)} ref={categoryInputRef} />
                  <Button onClick={() => handleAddSetting('accountCategories', newCategory, categories, setCategories, () => setNewCategory(''), categoryInputRef)}>Add</Button>
                </div>
                <div className="space-y-2">
                  {categories.map(c => (
                    <div key={c} className="flex justify-between items-center p-2 bg-muted/50 rounded border">
                      {editingSetting?.key === 'accountCategories' && editingSetting?.oldValue === c ? (
                        <div className="flex gap-2 w-full mr-2">
                          <Input value={editingSetting.newValue} onChange={(e) => setEditingSetting({ ...editingSetting, newValue: e.target.value })} autoFocus />
                          <Button size="sm" onClick={() => handleEditSetting('accountCategories', c, editingSetting.newValue, categories, setCategories)}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingSetting(null)}>Cancel</Button>
                        </div>
                      ) : (
                        <>
                          <span>{c}</span>
                          <div>
                            <Button variant="ghost" size="sm" onClick={() => setEditingSetting({ key: 'accountCategories', oldValue: c, newValue: c })}><Pencil className="w-4 h-4 text-blue-500" /></Button>
                            <Button variant="ghost" size="sm" onClick={() => handleRemoveSetting('accountCategories', c, categories, setCategories)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                  {categories.length === 0 && <p className="text-sm text-muted-foreground text-center">No categories added.</p>}
                </div>
              </CardContent>
            </GlassCard>

          </div>
        </TabsContent>
      </Tabs>

      {/* EDIT INCOME DIALOG */}
      <Dialog open={!!editingIncome} onOpenChange={(open) => !open && setEditingIncome(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Income</DialogTitle>
          </DialogHeader>
          {editingIncome && (
            <form onSubmit={handleUpdateIncome} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={editingIncome.date} onChange={e => setEditingIncome({ ...editingIncome, date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Autocomplete
                    value={editingIncome.clientName}
                    onChange={v => setEditingIncome({ ...editingIncome, clientName: v })}
                    suggestions={clients}
                    placeholder="Type client name..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Autocomplete
                    value={editingIncome.category || ''}
                    onChange={v => setEditingIncome({ ...editingIncome, category: v })}
                    suggestions={categories}
                    placeholder="Type category..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Payment Mode</Label>
                  <Autocomplete
                    value={editingIncome.paymentMethod}
                    onChange={v => setEditingIncome({ ...editingIncome, paymentMethod: v })}
                    suggestions={paymentMethods}
                    placeholder="Type payment mode..."
                  />
                </div>
                {editingIncome.paymentMethod.toLowerCase() === 'cheque' && (
                  <div className="space-y-2">
                    <Label>Cheque No.</Label>
                    <Input
                      value={editingIncome.chequeNo || ''}
                      onChange={e => setEditingIncome({ ...editingIncome, chequeNo: e.target.value })}
                      placeholder="Alphanumeric Cheque No."
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Deposited Bank</Label>
                  <Autocomplete
                    value={editingIncome.bank}
                    onChange={v => setEditingIncome({ ...editingIncome, bank: v })}
                    suggestions={banks}
                    placeholder="Type bank..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={editingIncome.amount} onChange={e => setEditingIncome({ ...editingIncome, amount: Number(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label>Invoice/Proforma No.</Label>
                  <Input value={editingIncome.invoiceNumber || ''} onChange={e => setEditingIncome({ ...editingIncome, invoiceNumber: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Ref No.</Label>
                  <Input value={editingIncome.rfNo || ''} onChange={e => setEditingIncome({ ...editingIncome, rfNo: e.target.value })} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Remarks</Label>
                  <Input value={editingIncome.remarks || ''} onChange={e => setEditingIncome({ ...editingIncome, remarks: e.target.value })} />
                </div>
                <div className="flex items-center space-x-2 py-1 col-span-2">
                  <Checkbox
                    id="edit-income-gst"
                    checked={editingIncome.isGst || false}
                    onCheckedChange={(checked) => setEditingIncome({ ...editingIncome, isGst: checked === true })}
                  />
                  <Label htmlFor="edit-income-gst" className="font-medium cursor-pointer">GST (18% Included)</Label>
                </div>
                {editingIncome.isGst && (
                  <>
                    <div className="space-y-2">
                      <Label>Without GST Amount</Label>
                      <Input
                        type="text"
                        readOnly
                        value={editingIncome.amount ? (Number(editingIncome.amount) / 1.18).toFixed(2) : '0.00'}
                        className="bg-muted text-muted-foreground font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>GST Amount (18%)</Label>
                      <Input
                        type="text"
                        readOnly
                        value={editingIncome.amount ? (Number(editingIncome.amount) - Number(editingIncome.amount) / 1.18).toFixed(2) : '0.00'}
                        className="bg-muted text-muted-foreground font-semibold"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <Button type="button" variant="ghost" onClick={() => setEditingIncome(null)} className="mr-2">Cancel</Button>
                <Button type="submit">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT EXPENSE DIALOG */}
      <Dialog open={!!editingExpense} onOpenChange={(open) => !open && setEditingExpense(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Expense</DialogTitle>
          </DialogHeader>
          {editingExpense && (
            <form onSubmit={handleUpdateExpense} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={editingExpense.date} onChange={e => setEditingExpense({ ...editingExpense, date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Autocomplete
                    value={editingExpense.category}
                    onChange={v => setEditingExpense({ ...editingExpense, category: v })}
                    suggestions={categories}
                    placeholder="Type category..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bank</Label>
                  <Autocomplete
                    value={editingExpense.bank || ''}
                    onChange={v => setEditingExpense({ ...editingExpense, bank: v })}
                    suggestions={banks}
                    placeholder="Type bank..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Name</Label>
                  <Autocomplete
                    value={editingExpense.clientName || ''}
                    onChange={v => setEditingExpense({ ...editingExpense, clientName: v })}
                    suggestions={clients}
                    placeholder="Type client name..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={editingExpense.amount} onChange={e => setEditingExpense({ ...editingExpense, amount: Number(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label>Ref No.</Label>
                  <Input value={editingExpense.rfNo || ''} onChange={e => setEditingExpense({ ...editingExpense, rfNo: e.target.value })} />
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Remarks</Label>
                  <Input value={editingExpense.remarks || ''} onChange={e => setEditingExpense({ ...editingExpense, remarks: e.target.value })} />
                </div>
                <div className="flex items-center space-x-2 py-1 col-span-2">
                  <Checkbox
                    id="edit-expense-gst"
                    checked={editingExpense.isGst || false}
                    onCheckedChange={(checked) => setEditingExpense({ ...editingExpense, isGst: checked === true })}
                  />
                  <Label htmlFor="edit-expense-gst" className="font-medium cursor-pointer">GST (18% Included)</Label>
                </div>
                {editingExpense.isGst && (
                  <>
                    <div className="space-y-2">
                      <Label>Without GST Amount</Label>
                      <Input
                        type="text"
                        readOnly
                        value={editingExpense.amount ? (Number(editingExpense.amount) / 1.18).toFixed(2) : '0.00'}
                        className="bg-muted text-muted-foreground font-semibold"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>GST Amount (18%)</Label>
                      <Input
                        type="text"
                        readOnly
                        value={editingExpense.amount ? (Number(editingExpense.amount) - Number(editingExpense.amount) / 1.18).toFixed(2) : '0.00'}
                        className="bg-muted text-muted-foreground font-semibold"
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <Button type="button" variant="ghost" onClick={() => setEditingExpense(null)} className="mr-2">Cancel</Button>
                <Button type="submit" variant="destructive">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* EDIT BANK DEPOSIT DIALOG */}
      <Dialog open={!!editingBankDeposit} onOpenChange={(open) => !open && setEditingBankDeposit(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Bank Deposit</DialogTitle>
          </DialogHeader>
          {editingBankDeposit && (
            <form onSubmit={handleUpdateBankDeposit} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" className="[&::-webkit-calendar-picker-indicator]:block" value={editingBankDeposit.date} onChange={e => setEditingBankDeposit({ ...editingBankDeposit, date: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Autocomplete
                    value={editingBankDeposit.type}
                    onChange={v => setEditingBankDeposit({ ...editingBankDeposit, type: v as 'Cash' | 'Cheque' })}
                    suggestions={['Cash', 'Cheque']}
                    placeholder="Type Cash/Cheque..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Deposited Bank</Label>
                  <Autocomplete
                    value={editingBankDeposit.bank || ''}
                    onChange={v => setEditingBankDeposit({ ...editingBankDeposit, bank: v })}
                    suggestions={banks}
                    placeholder="Type bank..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={editingBankDeposit.amount} onChange={e => setEditingBankDeposit({ ...editingBankDeposit, amount: Number(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label>Remarks</Label>
                  <Input value={editingBankDeposit.remarks || ''} onChange={e => setEditingBankDeposit({ ...editingBankDeposit, remarks: e.target.value })} />
                </div>
                {editingBankDeposit.type === 'Cheque' && (
                  <>
                    <div className="space-y-2">
                      <Label>Cheque No.</Label>
                      <Input value={editingBankDeposit.chequeNo || ''} onChange={e => setEditingBankDeposit({ ...editingBankDeposit, chequeNo: e.target.value })} required />
                    </div>
                    <div className="space-y-2">
                      <Label>Bank Name</Label>
                      <Autocomplete
                        value={editingBankDeposit.bankName || ''}
                        onChange={v => setEditingBankDeposit({ ...editingBankDeposit, bankName: v })}
                        suggestions={banks}
                        placeholder="Type bank name..."
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-end pt-4">
                <Button type="button" variant="ghost" onClick={() => setEditingBankDeposit(null)} className="mr-2">Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Save Changes</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* PDF PREVIEW DIALOG */}
      <Dialog open={!!pdfPreviewData} onOpenChange={(open) => !open && setPdfPreviewData(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>PDF Preview: {pdfPreviewData?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-auto border rounded mt-4">
            {pdfPreviewData && (
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    {pdfPreviewData.headers.map((h, i) => <TableHead key={i}>{h}</TableHead>)}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pdfPreviewData.tableData.map((row, i) => (
                    <TableRow key={i}>
                      {row.map((cell, j) => <TableCell key={j}>{cell}</TableCell>)}
                    </TableRow>
                  ))}
                  {pdfPreviewData.tableData.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={pdfPreviewData.headers.length} className="text-center py-4 text-muted-foreground">No data to preview</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </div>
          <div className="flex justify-end pt-4 gap-2 mt-auto">
            <Button variant="ghost" onClick={() => setPdfPreviewData(null)}>Cancel</Button>
            <Button onClick={downloadGeneratedPDF} variant="default">
              <Download className="w-4 h-4 mr-2" /> Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAccountsPage;
