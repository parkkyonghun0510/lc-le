'use client';

import { Layout } from '@/components/layout/Layout';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { KhmerText, EnglishText } from '@/components/ui/KhmerText';

export default function FontDemoPage() {
  return (
    <ProtectedRoute>
      <Layout>
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4">Google Fonts Khmer Demo</h1>
            <p className="text-lg text-gray-600">Testing Noto Sans Khmer font implementation</p>
          </div>

          {/* Khmer Text Examples */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">អត្ថបទជាភាសាខ្មែរ</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">ពាក្យសុំកម្ចី</h3>
                <p className="text-base">
                  សូមអភ័យទោស ខ្ញុំចង់ដាក់ពាក្យសុំកម្ចីដើម្បីពង្រីកអាជីវកម្មរបស់ខ្ញុំ។ 
                  ខ្ញុំមានផែនការលម្អិតសម្រាប់ការប្រើប្រាស់ប្រាក់កម្ចីនេះ។
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">ព័ត៌មានផ្ទាល់ខ្លួន</h3>
                <p className="text-base">
                  ឈ្មោះ: សុខ វណ្ណា<br/>
                  លេខអត្តសញ្ញាណប័ណ្ណ: ១២៣៤៥៦៧៨៩<br/>
                  លេខទូរស័ព្ទ: ០១២ ៣៤៥ ៦៧៨<br/>
                  អាសយដ្ឋាន: ភូមិស្លាក់ ឃុំព្រែកអំបិល ស្រុកគងពិសី ខេត្តកំពង់ចាម
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">ព័ត៌មានកម្ចី</h3>
                <p className="text-base">
                  ចំនួនទឹកប្រាក់ស្នើសុំ: ៥០,០០០ ៛ (រៀល)<br/>
                  រយៈពេលកម្ចី: ២៤ ខែ<br/>
                  គោលបំណង: ពង្រីកអាជីវកម្ម<br/>
                  ប្រភេទផលិតផល: កម្ចីអាជីវកម្មតូច
                </p>
              </div>
            </div>
          </div>

          {/* Font Size Examples */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">ឧទាហរណ៍ទំហំអក្សរ</h2>
            
            <div className="space-y-2">
              <p className="text-khmer-xs">អក្សរតូច (xs): សូមអភ័យទោស</p>
              <p className="text-khmer-sm">អក្សរតូច (sm): សូមអភ័យទោស</p>
              <p className="text-khmer-base">អក្សរធម្មតា (base): សូមអភ័យទោស</p>
              <p className="text-khmer-lg">អក្សរធំ (lg): សូមអភ័យទោស</p>
              <p className="text-khmer-xl">អក្សរធំ (xl): សូមអភ័យទោស</p>
              <p className="text-khmer-2xl">អក្សរធំ (2xl): សូមអភ័យទោស</p>
              <p className="text-khmer-3xl">អក្សរធំ (3xl): សូមអភ័យទោស</p>
              <p className="text-khmer-4xl">អក្សរធំ (4xl): សូមអភ័យទោស</p>
            </div>
          </div>

          {/* Mixed Language Example */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">ឧទាហរណ៍ភាសាលាយ</h2>
            
            <div className="space-y-4">
              <div>
                <KhmerText as="h3" className="text-lg font-semibold mb-2">
                  ពាក្យសុំកម្ចី (Loan Application)
                </KhmerText>
                <p className="text-base">
                  <KhmerText>ឈ្មោះ: </KhmerText>
                  <EnglishText>Sok Vanna</EnglishText>
                </p>
              </div>

              <div>
                <KhmerText as="h3" className="text-lg font-semibold mb-2">
                  ព័ត៌មានកម្ចី (Loan Information)
                </KhmerText>
                <p className="text-base">
                  <KhmerText>ចំនួនទឹកប្រាក់: </KhmerText>
                  <EnglishText>50,000 ៛</EnglishText>
                </p>
                <p className="text-base">
                  <KhmerText>រយៈពេល: </KhmerText>
                  <EnglishText>24 months</EnglishText>
                </p>
              </div>

              <div>
                <KhmerText as="h3" className="text-lg font-semibold mb-2">
                  ស្ថានភាព (Status)
                </KhmerText>
                <div className="flex gap-4">
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    <KhmerText>កំពុងពិនិត្យ</KhmerText>
                  </span>
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    <EnglishText>Under Review</EnglishText>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Component Usage Examples */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">ឧទាហរណ៍ការប្រើប្រាស់ Components</h2>
            
            <div className="space-y-4">
              <div>
                <KhmerText as="h3" className="text-lg font-semibold mb-2">
                  ការប្រើប្រាស់ KhmerText Component
                </KhmerText>
                <KhmerText className="text-base">
                  នេះគឺជាឧទាហរណ៍នៃការប្រើប្រាស់ KhmerText component ដែលប្រើអក្សរខ្មែរ។
                </KhmerText>
              </div>

              <div>
                <EnglishText as="h3" className="text-lg font-semibold mb-2">
                  Using EnglishText Component
                </EnglishText>
                <EnglishText className="text-base">
                  This is an example of using the EnglishText component with English font.
                </EnglishText>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Mixed Usage</h3>
                <p className="text-base">
                  <KhmerText>អត្ថបទខ្មែរ: </KhmerText>
                  <EnglishText>English text: </EnglishText>
                  <KhmerText>អត្ថបទខ្មែរបន្ថែម</KhmerText>
                </p>
              </div>
            </div>
          </div>

          {/* CSS Classes Usage */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">ឧទាហរណ៍ការប្រើប្រាស់ CSS Classes</h2>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Font Classes</h3>
                <p className="font-khmer text-base">
                  នេះប្រើ .font-khmer class សម្រាប់អក្សរខ្មែរ។
                </p>
                <p className="font-english text-base">
                  This uses .font-english class for English text.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Responsive Font Sizes</h3>
                <div className="space-y-2">
                  <p className="font-khmer text-khmer-xs">អក្សរតូច (.text-khmer-xs)</p>
                  <p className="font-khmer text-khmer-sm">អក្សរតូច (.text-khmer-sm)</p>
                  <p className="font-khmer text-khmer-base">អក្សរធម្មតា (.text-khmer-base)</p>
                  <p className="font-khmer text-khmer-lg">អក្សរធំ (.text-khmer-lg)</p>
                  <p className="font-khmer text-khmer-xl">អក្សរធំ (.text-khmer-xl)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    </ProtectedRoute>
  );
} 