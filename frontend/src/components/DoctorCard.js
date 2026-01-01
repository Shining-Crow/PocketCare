export default function DoctorCard({ doctor, onClick }) {
    return (
        <div
            className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center text-center h-full border border-transparent hover:border-primary-500 hover:shadow-2xl transition-all duration-200 group relative overflow-hidden"
            style={{ minHeight: '280px' }}
        >
            {/* Decorative background blob */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-blue-100 rounded-full opacity-30 group-hover:scale-110 transition-transform duration-300 z-0" />

            {/* Avatar */}
            <div className="w-20 h-20 bg-gradient-to-tr from-blue-200 to-blue-400 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md mb-3 z-10 border-4 border-white">
                {doctor.name ? doctor.name.charAt(0) : 'D'}
            </div>

            {/* Specialty badge */}
            <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-2 z-10 border border-blue-200">
                {doctor.specialty}
            </span>

            {/* Name */}
            <h2 className="text-xl font-bold text-gray-800 mb-1 z-10 group-hover:text-blue-700 transition-colors duration-200">
                {doctor.name}
            </h2>

            {/* Rating */}
            <div className="flex items-center justify-center gap-1 mb-2 z-10">
                {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                        key={i}
                        className={`w-4 h-4 ${i < Math.round(doctor.rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                    >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.175c.969 0 1.371 1.24.588 1.81l-3.38 2.455a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.38-2.454a1 1 0 00-1.175 0l-3.38 2.454c-.784.57-1.838-.196-1.54-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.175a1 1 0 00.95-.69l1.286-3.967z" />
                    </svg>
                ))}
                <span className="ml-1 text-xs text-gray-500">({doctor.rating})</span>
            </div>

            {/* Book button */}
            <button
                className="mt-auto px-4 py-2 bg-blue-600 text-white rounded-full font-semibold shadow hover:bg-blue-700 transition-colors duration-200 z-10"
                onClick={onClick}
            >
                View Profile
            </button>
        </div>
    );
}
